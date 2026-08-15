'use strict';

const Realm = require('realm');
const RNFS = require('react-native-fs');
const CURRENT_SCHEMAS = require('./shared/schema-current');
const LEGACY_SCHEMAS = require('./shared/schema-legacy-v100');

const stripFile = uri => decodeURIComponent(String(uri||'').replace(/^file:\/\//,''));
const exists = p => RNFS.exists(p);
async function rm(p){try{if(await exists(p))await RNFS.unlink(p)}catch{}}
async function cleanupSidecars(p){for(const suffix of ['.lock','.note','.management'])await rm(`${p}${suffix}`)}
function closeRealm(r){try{if(r&&!r.isClosed)r.close()}catch{}}

function canOpenCurrent(p){let r;try{r=new Realm({path:p,schema:CURRENT_SCHEMAS,schemaVersion:1});return true}catch{return false}finally{closeRealm(r)}}

function exportLegacy(p){let r;try{
  r=new Realm({path:p,schema:LEGACY_SCHEMAS,schemaVersion:1});
  const trainees=Array.from(r.objects('Trainee')).map(t=>({id:t.id,name:t.name,country:t.country,countryCode:t.countryCode,phone:t.phone,normalizedPhone:t.normalizedPhone,whatsappEnabled:t.whatsappEnabled,notes:t.notes??'',archived:t.archived,createdAt:new Date(t.createdAt),updatedAt:new Date(t.updatedAt)}));
  const plans=Array.from(r.objects('MembershipPlan')).map(x=>({id:x.id,name:x.name,monthlyPrice:Number(x.monthlyPrice),active:x.active}));
  const subscriptions=Array.from(r.objects('Subscription')).map(s=>({id:s.id,traineeId:s.traineeId,planId:s.planId,planName:s.planNameSnapshot,monthlyPrice:Number(s.monthlyPriceSnapshot),months:Number(s.numberOfMonths),totalAmount:Number(s.totalAmount),startDate:new Date(s.startDate),endDate:new Date(s.endDate),createdAt:new Date(s.createdAt)}));
  const payments=Array.from(r.objects('Payment')).map(x=>({id:x.id,traineeId:x.traineeId,subscriptionId:x.subscriptionId,amount:Number(x.amount),paymentDate:new Date(x.paymentDate),method:x.method??'نقدي',note:x.note??'',createdAt:new Date(x.createdAt)}));
  const reminders=Array.from(r.objects('WhatsAppReminder')).map(x=>({id:x.id,traineeId:x.traineeId,subscriptionId:x.subscriptionId,scheduledDate:new Date(x.scheduledDate),sentAt:x.sentAt?new Date(x.sentAt):null,status:x.status||'pending',message:x.message||'',errorMessage:x.errorMessage??''}));
  const s=r.objectForPrimaryKey('AppSettings','app');
  const settings=s?{gymName:s.gymName,currency:s.currency,reminderDays:String(s.reminderDays),reminderTemplate:s.whatsappMessageTemplate}:null;
  return{trainees,plans,subscriptions,payments,reminders,settings};
}finally{closeRealm(r)}}

async function writeCurrent(p,data){await cleanupSidecars(p);await rm(p);let r;try{
  r=new Realm({path:p,schema:CURRENT_SCHEMAS,schemaVersion:1});
  r.write(()=>{
    data.trainees.forEach(x=>r.create('Trainee',x));data.plans.forEach(x=>r.create('Plan',x));data.subscriptions.forEach(x=>r.create('Subscription',x));data.payments.forEach(x=>r.create('Payment',x));data.reminders.forEach(x=>r.create('Reminder',x));
    if(data.settings)Object.entries(data.settings).forEach(([key,value])=>r.create('Setting',{key,value:String(value??'')}));
  });
}finally{closeRealm(r)}}

async function normalizeCandidate(sourcePath,tempPath){
  await rm(tempPath);await RNFS.copyFile(stripFile(sourcePath),tempPath);
  if(canOpenCurrent(tempPath))return tempPath;
  let data;try{data=exportLegacy(tempPath)}catch{throw new Error('ملف النسخة الاحتياطية غير صالح أو غير مدعوم')}
  await rm(tempPath);await writeCurrent(tempPath,data);
  if(!canOpenCurrent(tempPath))throw new Error('تعذر تحويل النسخة الاحتياطية إلى الإصدار الحالي');
  return tempPath;
}

async function restoreRealmBackup({sourcePath,currentPath,closeCurrent,reopenCurrent}){
  const dir=currentPath.slice(0,currentPath.lastIndexOf('/'));
  const candidate=`${dir}/restore-candidate.realm`;
  const safety=`${dir}/before-restore-${Date.now()}.realm`;
  try{
    await normalizeCandidate(sourcePath,candidate);
    closeCurrent();
    const hadCurrent=await exists(currentPath);
    if(hadCurrent)await RNFS.copyFile(currentPath,safety);
    await cleanupSidecars(currentPath);await rm(currentPath);await RNFS.copyFile(candidate,currentPath);await cleanupSidecars(candidate);await rm(candidate);
    if(!canOpenCurrent(currentPath))throw new Error('تعذر فتح البيانات بعد الاستعادة');
    reopenCurrent();
    return{restored:true,safetyPath:hadCurrent?safety:null};
  }catch(error){
    try{closeCurrent()}catch{}
    if(await exists(safety)){await cleanupSidecars(currentPath);await rm(currentPath);await RNFS.copyFile(safety,currentPath)}
    try{reopenCurrent()}catch{}
    await cleanupSidecars(candidate);await rm(candidate);
    throw error;
  }
}

module.exports={restoreRealmBackup,stripFile};
