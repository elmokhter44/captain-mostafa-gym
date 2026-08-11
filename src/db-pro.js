'use strict';

const Realm = require('realm');
const crypto = require('crypto');
const schemas = require('./schema-current');
const { PLAN_DEFAULTS, addCalendarMonthsInclusive, subscriptionStatus, daysUntil, normalizePhone, money, dateOnly } = require('./logic');

let realm;
const id = () => crypto.randomUUID();
const iso = d => d ? new Date(d).toISOString() : null;

function open(dbPath) {
  realm = new Realm({ path: dbPath, schema: schemas, schemaVersion: 1 });
  seed();
  return realm;
}

function seed() {
  if (!realm.objects('Plan').length) {
    realm.write(() => PLAN_DEFAULTS.forEach(p => realm.create('Plan', { ...p, monthlyPrice:Number(p.monthlyPrice), active:true })));
  }
  const defaults = {
    gymName:'كابتن مصطفى الريدي', currency:'جنيه', reminderDays:'2',
    reminderTemplate:'أهلاً {name}، نذكرك بأن اشتراكك في جيم {gymName} سينتهي بتاريخ {endDate}. يسعدنا تجديد اشتراكك.'
  };
  realm.write(() => Object.entries(defaults).forEach(([key,value]) => {
    if (!realm.objectForPrimaryKey('Setting', key)) realm.create('Setting', { key, value });
  }));
}

function settings() {
  const out = {};
  realm.objects('Setting').forEach(s => out[s.key] = s.value);
  return out;
}
function saveSettings(input) {
  realm.write(() => Object.entries(input || {}).forEach(([key,value]) => realm.create('Setting', { key, value:String(value ?? '') }, Realm.UpdateMode.Modified)));
  return settings();
}

function plans(includeInactive=false) {
  const rows = includeInactive ? realm.objects('Plan') : realm.objects('Plan').filtered('active == true');
  return Array.from(rows).map(p => ({ id:p.id, name:p.name, monthlyPrice:p.monthlyPrice, active:p.active })).sort((a,b)=>a.name.localeCompare(b.name,'ar'));
}
function createPlan(data) {
  const name = String(data?.name || '').trim();
  const price = money(data?.monthlyPrice);
  if (!name) throw new Error('اسم خطة الاشتراك مطلوب');
  if (price <= 0) throw new Error('سعر الخطة يجب أن يكون أكبر من صفر');
  if (Array.from(realm.objects('Plan')).some(p => p.name.trim().toLowerCase() === name.toLowerCase())) throw new Error('توجد خطة بنفس الاسم بالفعل');
  const plan = { id:`plan-${id()}`, name, monthlyPrice:price, active:true };
  realm.write(() => realm.create('Plan', plan));
  return plan;
}
function updatePlan(planId, data) {
  const p = realm.objectForPrimaryKey('Plan', planId);
  if (!p) throw new Error('الخطة غير موجودة');
  const name = String(data?.name ?? p.name).trim();
  const price = money(data?.monthlyPrice ?? p.monthlyPrice);
  if (!name) throw new Error('اسم الخطة مطلوب');
  if (price <= 0) throw new Error('السعر يجب أن يكون أكبر من صفر');
  if (Array.from(realm.objects('Plan')).some(x => x.id !== planId && x.name.trim().toLowerCase() === name.toLowerCase())) throw new Error('توجد خطة بنفس الاسم بالفعل');
  realm.write(() => { p.name=name; p.monthlyPrice=price; if (typeof data?.active === 'boolean') p.active=data.active; });
  return { id:p.id, name:p.name, monthlyPrice:p.monthlyPrice, active:p.active };
}
function setPlanActive(planId, active) { return updatePlan(planId, { active:!!active }); }

function paymentsFor(subscriptionId) { return realm.objects('Payment').filtered('subscriptionId == $0', subscriptionId); }
function paidFor(subscriptionId) { return Array.from(paymentsFor(subscriptionId)).reduce((a,p)=>a+p.amount,0); }
function subView(s, now=new Date()) {
  const paid = money(paidFor(s.id));
  return { id:s.id, traineeId:s.traineeId, planId:s.planId, planName:s.planName, monthlyPrice:s.monthlyPrice, months:s.months,
    totalAmount:s.totalAmount, paid, remaining:money(Math.max(0,s.totalAmount-paid)), startDate:iso(s.startDate), endDate:iso(s.endDate),
    daysRemaining:daysUntil(s.endDate,now), status:subscriptionStatus(s.endDate,now), createdAt:iso(s.createdAt) };
}
function currentSub(traineeId) {
  const rows = Array.from(realm.objects('Subscription').filtered('traineeId == $0',traineeId).sorted('startDate',true));
  return rows[0] ? subView(rows[0]) : null;
}
function traineeView(t) {
  return { id:t.id, name:t.name, country:t.country, countryCode:t.countryCode, phone:t.phone, normalizedPhone:t.normalizedPhone,
    whatsappEnabled:t.whatsappEnabled, notes:t.notes, archived:t.archived, createdAt:iso(t.createdAt), updatedAt:iso(t.updatedAt), subscription:currentSub(t.id) };
}

function listTrainees({ search='', status='all', planId='all', owing=false, archived=false }={}) {
  let arr = Array.from(realm.objects('Trainee').filtered('archived == $0',!!archived)).map(traineeView);
  const q = String(search).trim().toLowerCase();
  if (q) arr = arr.filter(t => t.name.toLowerCase().includes(q) || t.phone.includes(q) || t.normalizedPhone.includes(q) || t.country.toLowerCase().includes(q));
  if (status !== 'all') arr = arr.filter(t => t.subscription?.status === status);
  if (planId !== 'all') arr = arr.filter(t => t.subscription?.planId === planId);
  if (owing) arr = arr.filter(t => (t.subscription?.remaining || 0) > 0);
  return arr.sort((a,b)=>a.name.localeCompare(b.name,'ar'));
}
function getTrainee(traineeId) {
  const t = realm.objectForPrimaryKey('Trainee',traineeId); if (!t) return null;
  const subscriptions = Array.from(realm.objects('Subscription').filtered('traineeId == $0',traineeId).sorted('startDate',true)).map(subView);
  const payments = Array.from(realm.objects('Payment').filtered('traineeId == $0',traineeId).sorted('paymentDate',true)).map(p => ({id:p.id,subscriptionId:p.subscriptionId,amount:p.amount,paymentDate:iso(p.paymentDate),method:p.method,note:p.note}));
  const reminders = Array.from(realm.objects('Reminder').filtered('traineeId == $0',traineeId).sorted('scheduledDate',true)).map(r => ({id:r.id,subscriptionId:r.subscriptionId,scheduledDate:iso(r.scheduledDate),sentAt:iso(r.sentAt),status:r.status,message:r.message,errorMessage:r.errorMessage}));
  return { ...traineeView(t), subscriptions, payments, reminders };
}
function validatePhoneUnique(normalizedPhone, exceptId='') {
  const found = Array.from(realm.objects('Trainee')).find(t => t.normalizedPhone === normalizedPhone && t.id !== exceptId && !t.archived);
  if (found) throw new Error('يوجد متدرب مسجل بهذا الرقم بالفعل');
}

function createReminderInternal(traineeId, subscriptionId, endDate) {
  const t=realm.objectForPrimaryKey('Trainee',traineeId); if (!t?.whatsappEnabled) return;
  const st=settings(); const days=Math.max(0,parseInt(st.reminderDays||'2',10)); const scheduled=new Date(endDate); scheduled.setDate(scheduled.getDate()-days);
  const dateText=new Intl.DateTimeFormat('ar-EG',{dateStyle:'medium'}).format(endDate);
  const message=(st.reminderTemplate||'').replaceAll('{name}',t.name).replaceAll('{gymName}',st.gymName||'').replaceAll('{endDate}',dateText);
  realm.create('Reminder',{id:id(),traineeId,subscriptionId,scheduledDate:dateOnly(scheduled),sentAt:null,status:'pending',message,errorMessage:''});
}
function rebuildReminder(traineeId, subscriptionId, endDate) {
  realm.delete(realm.objects('Reminder').filtered('subscriptionId == $0 AND status == "pending"',subscriptionId));
  createReminderInternal(traineeId,subscriptionId,endDate);
}
function createSubscription(traineeId,data) {
  const p=realm.objectForPrimaryKey('Plan',data.planId); if(!p||!p.active) throw new Error('اختر خطة اشتراك صحيحة');
  const months=Math.max(1,parseInt(data.months,10)||1); const startDate=dateOnly(data.startDate||new Date()); const endDate=addCalendarMonthsInclusive(startDate,months);
  const totalAmount=money(p.monthlyPrice*months); const initial=money(data.paid||0); if(initial<0||initial>totalAmount) throw new Error('قيمة المدفوع غير صحيحة');
  const sId=id(), createdAt=new Date();
  realm.create('Subscription',{id:sId,traineeId,planId:p.id,planName:p.name,monthlyPrice:p.monthlyPrice,months,totalAmount,startDate,endDate,createdAt});
  if(initial>0) realm.create('Payment',{id:id(),traineeId,subscriptionId:sId,amount:initial,paymentDate:new Date(),method:data.method||'نقدي',note:'دفعة بداية الاشتراك',createdAt:new Date()});
  createReminderInternal(traineeId,sId,endDate); return sId;
}
function addTrainee(data) {
  const name=String(data.name||'').trim(); if(!name) throw new Error('اسم المتدرب مطلوب');
  const normalizedPhone=normalizePhone(data.countryCode||'+20',data.phone||''); if(normalizedPhone.replace(/\D/g,'').length<8) throw new Error('رقم الموبايل غير صحيح'); validatePhoneUnique(normalizedPhone);
  const traineeId=id(), now=new Date();
  realm.write(()=>{ realm.create('Trainee',{id:traineeId,name,country:String(data.country||'مصر'),countryCode:String(data.countryCode||'+20'),phone:String(data.phone||''),normalizedPhone,whatsappEnabled:data.whatsappEnabled!==false,notes:String(data.notes||''),archived:false,createdAt:now,updatedAt:now}); createSubscription(traineeId,data); });
  return getTrainee(traineeId);
}
function updateTrainee(traineeId,data) {
  const t=realm.objectForPrimaryKey('Trainee',traineeId); if(!t) throw new Error('المتدرب غير موجود');
  const name=String(data.name??t.name).trim(); if(!name) throw new Error('اسم المتدرب مطلوب');
  const normalizedPhone=normalizePhone(data.countryCode??t.countryCode,data.phone??t.phone); validatePhoneUnique(normalizedPhone,traineeId);
  realm.write(()=>{ t.name=name;t.country=String(data.country??t.country);t.countryCode=String(data.countryCode??t.countryCode);t.phone=String(data.phone??t.phone);t.normalizedPhone=normalizedPhone;t.whatsappEnabled=data.whatsappEnabled??t.whatsappEnabled;t.notes=String(data.notes??t.notes);t.updatedAt=new Date(); });
  return getTrainee(traineeId);
}
function updateCurrentSubscription(traineeId,data) {
  const rows=Array.from(realm.objects('Subscription').filtered('traineeId == $0',traineeId).sorted('startDate',true)); const s=rows[0]; if(!s) throw new Error('لا يوجد اشتراك لتعديله');
  const p=realm.objectForPrimaryKey('Plan',data.planId??s.planId); if(!p) throw new Error('الخطة غير موجودة');
  const months=Math.max(1,parseInt(data.months??s.months,10)||1); const start=dateOnly(data.startDate??s.startDate); const end=addCalendarMonthsInclusive(start,months); const total=money(p.monthlyPrice*months); const paid=money(paidFor(s.id));
  if(total<paid) throw new Error(`لا يمكن جعل إجمالي الاشتراك أقل من المدفوع الحالي (${paid})`);
  realm.write(()=>{ s.planId=p.id;s.planName=p.name;s.monthlyPrice=p.monthlyPrice;s.months=months;s.totalAmount=total;s.startDate=start;s.endDate=end;rebuildReminder(traineeId,s.id,end); });
  return getTrainee(traineeId);
}
function archiveTrainee(traineeId,archived=true){const t=realm.objectForPrimaryKey('Trainee',traineeId);if(!t)throw new Error('المتدرب غير موجود');realm.write(()=>{t.archived=!!archived;t.updatedAt=new Date();});return true;}
function deleteTrainee(traineeId){const t=realm.objectForPrimaryKey('Trainee',traineeId);if(!t)return true;realm.write(()=>{realm.delete(realm.objects('Reminder').filtered('traineeId == $0',traineeId));realm.delete(realm.objects('Payment').filtered('traineeId == $0',traineeId));realm.delete(realm.objects('Subscription').filtered('traineeId == $0',traineeId));realm.delete(t);});return true;}
function addPayment(traineeId,subscriptionId,amount,method='نقدي',note=''){const s=realm.objectForPrimaryKey('Subscription',subscriptionId);if(!s||s.traineeId!==traineeId)throw new Error('الاشتراك غير موجود');const remaining=money(s.totalAmount-paidFor(s.id)),n=money(amount);if(n<=0||n>remaining)throw new Error(`الدفعة يجب أن تكون أكبر من صفر وألا تتجاوز المتبقي (${remaining})`);realm.write(()=>realm.create('Payment',{id:id(),traineeId,subscriptionId,amount:n,paymentDate:new Date(),method:String(method||'نقدي'),note:String(note||''),createdAt:new Date()}));return getTrainee(traineeId);}
function renew(traineeId,data){if(!realm.objectForPrimaryKey('Trainee',traineeId))throw new Error('المتدرب غير موجود');realm.write(()=>createSubscription(traineeId,data));return getTrainee(traineeId);}

function dashboard(){
  const list=listTrainees(); let active=0,expiring=0,expired=0,remaining=0,currentValue=0; list.forEach(t=>{if(t.subscription){if(t.subscription.status==='active')active++;else if(t.subscription.status==='expiring')expiring++;else expired++;remaining+=t.subscription.remaining;currentValue+=t.subscription.totalAmount;}});
  const now=new Date(),y=now.getFullYear(),m=now.getMonth(); let paidMonth=0,totalPaid=0; const methodTotals={}; const recentPayments=[];
  Array.from(realm.objects('Payment').sorted('paymentDate',true)).forEach((p,i)=>{totalPaid+=p.amount;if(p.paymentDate.getFullYear()===y&&p.paymentDate.getMonth()===m)paidMonth+=p.amount;methodTotals[p.method]=(methodTotals[p.method]||0)+p.amount;if(i<8){const t=realm.objectForPrimaryKey('Trainee',p.traineeId);recentPayments.push({id:p.id,name:t?.name||'—',amount:p.amount,method:p.method,paymentDate:iso(p.paymentDate)});}});
  const planCounts={}; list.forEach(t=>{const n=t.subscription?.planName;if(n)planCounts[n]=(planCounts[n]||0)+1;});
  const expiringSoon=list.filter(t=>t.subscription?.status==='expiring').sort((a,b)=>a.subscription.daysRemaining-b.subscription.daysRemaining).slice(0,8);
  return {total:list.length,active,expiring,expired,remaining:money(remaining),paidMonth:money(paidMonth),totalPaid:money(totalPaid),currentValue:money(currentValue),collectionRate:currentValue?Math.round(((currentValue-remaining)/currentValue)*100):0,planCounts,methodTotals,recentPayments,expiringSoon};
}
function dueReminders(){const today=dateOnly(new Date());return Array.from(realm.objects('Reminder').filtered('status == "pending"')).filter(r=>dateOnly(r.scheduledDate)<=today).map(r=>{const t=realm.objectForPrimaryKey('Trainee',r.traineeId);return{id:r.id,traineeId:r.traineeId,subscriptionId:r.subscriptionId,name:t?.name||'',phone:t?.normalizedPhone||'',message:r.message,scheduledDate:iso(r.scheduledDate)}});}
function markReminder(idValue,status,errorMessage=''){const r=realm.objectForPrimaryKey('Reminder',idValue);if(!r)return false;realm.write(()=>{r.status=status;r.errorMessage=String(errorMessage||'');if(status==='sent')r.sentAt=new Date();});return true;}
function exportRows(){return Array.from(realm.objects('Trainee')).map(t=>{const s=currentSub(t.id);return{name:t.name,country:t.country,countryCode:t.countryCode,phone:t.phone,normalizedPhone:t.normalizedPhone,plan:s?.planName||'',monthlyPrice:s?.monthlyPrice||0,months:s?.months||0,startDate:s?.startDate||'',endDate:s?.endDate||'',status:s?.status||'',total:s?.totalAmount||0,paid:s?.paid||0,remaining:s?.remaining||0,archived:t.archived?'نعم':'لا',notes:t.notes||''};});}

module.exports={open,plans,createPlan,updatePlan,setPlanActive,settings,saveSettings,listTrainees,getTrainee,addTrainee,updateTrainee,updateCurrentSubscription,archiveTrainee,deleteTrainee,addPayment,renew,dashboard,dueReminders,markReminder,exportRows};
