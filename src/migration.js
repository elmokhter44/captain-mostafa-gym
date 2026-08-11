'use strict';

const fs = require('fs');
const Realm = require('realm');
const CURRENT_SCHEMAS = require('./schema-current');
const LEGACY_SCHEMAS = require('./schema-legacy-v100');

function closeRealm(realm) {
  try { if (realm && !realm.isClosed) realm.close(); } catch {}
}

function cleanupSidecars(realmPath) {
  for (const suffix of ['.lock', '.note', '.management']) {
    try { fs.rmSync(`${realmPath}${suffix}`, { recursive: true, force: true }); } catch {}
  }
}

function canOpenCurrent(dbPath) {
  let realm;
  try {
    realm = new Realm({ path: dbPath, schema: CURRENT_SCHEMAS, schemaVersion: 1 });
    return true;
  } catch {
    return false;
  } finally {
    closeRealm(realm);
  }
}

function exportLegacy(dbPath) {
  let realm;
  try {
    realm = new Realm({ path: dbPath, schema: LEGACY_SCHEMAS, schemaVersion: 1 });
    const trainees = Array.from(realm.objects('Trainee')).map(t => ({
      id:t.id, name:t.name, country:t.country, countryCode:t.countryCode, phone:t.phone, normalizedPhone:t.normalizedPhone,
      whatsappEnabled:t.whatsappEnabled, notes:t.notes ?? '', archived:t.archived, createdAt:new Date(t.createdAt), updatedAt:new Date(t.updatedAt)
    }));
    const plans = Array.from(realm.objects('MembershipPlan')).map(p => ({
      id:p.id, name:p.name, monthlyPrice:Number(p.monthlyPrice), active:p.active
    }));
    const subscriptions = Array.from(realm.objects('Subscription')).map(s => ({
      id:s.id, traineeId:s.traineeId, planId:s.planId, planName:s.planNameSnapshot, monthlyPrice:Number(s.monthlyPriceSnapshot),
      months:Number(s.numberOfMonths), totalAmount:Number(s.totalAmount), startDate:new Date(s.startDate), endDate:new Date(s.endDate), createdAt:new Date(s.createdAt)
    }));
    const payments = Array.from(realm.objects('Payment')).map(p => ({
      id:p.id, traineeId:p.traineeId, subscriptionId:p.subscriptionId, amount:Number(p.amount), paymentDate:new Date(p.paymentDate),
      method:p.method ?? 'نقدي', note:p.note ?? '', createdAt:new Date(p.createdAt)
    }));
    const reminders = Array.from(realm.objects('WhatsAppReminder')).map(r => ({
      id:r.id, traineeId:r.traineeId, subscriptionId:r.subscriptionId, scheduledDate:new Date(r.scheduledDate),
      sentAt:r.sentAt ? new Date(r.sentAt) : null, status:r.status || 'pending', message:r.message || '', errorMessage:r.errorMessage ?? ''
    }));
    const s = realm.objectForPrimaryKey('AppSettings', 'app');
    const settings = s ? {
      gymName:s.gymName,
      currency:s.currency,
      reminderDays:String(s.reminderDays),
      reminderTemplate:s.whatsappMessageTemplate
    } : null;
    return { trainees, plans, subscriptions, payments, reminders, settings };
  } finally {
    closeRealm(realm);
  }
}

function writeCurrent(tempPath, data) {
  cleanupSidecars(tempPath);
  try { fs.rmSync(tempPath, { force:true }); } catch {}
  let realm;
  try {
    realm = new Realm({ path:tempPath, schema:CURRENT_SCHEMAS, schemaVersion:1 });
    realm.write(() => {
      for (const row of data.trainees) realm.create('Trainee', row);
      for (const row of data.plans) realm.create('Plan', row);
      for (const row of data.subscriptions) realm.create('Subscription', row);
      for (const row of data.payments) realm.create('Payment', row);
      for (const row of data.reminders) realm.create('Reminder', row);
      if (data.settings) {
        for (const [key,value] of Object.entries(data.settings)) realm.create('Setting', { key, value:String(value ?? '') });
      }
    });
  } finally {
    closeRealm(realm);
  }
}

function repairLegacyRealmIfNeeded(dbPath, logger = () => {}) {
  if (!fs.existsSync(dbPath)) return { repaired:false, reason:'database-does-not-exist' };
  if (canOpenCurrent(dbPath)) return { repaired:false, reason:'already-current' };

  logger('OLD REALM SCHEMA DETECTED; STARTING SAFE DATA MIGRATION');
  const data = exportLegacy(dbPath);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${dbPath}.pre-v1.0.2-${stamp}.bak`;
  const tempPath = `${dbPath}.v1.0.2-migrated.realm`;

  fs.copyFileSync(dbPath, backupPath);
  logger(`LEGACY DATABASE BACKUP CREATED: ${backupPath}`);
  writeCurrent(tempPath, data);
  if (!canOpenCurrent(tempPath)) throw new Error('فشل التحقق من قاعدة البيانات المحولة. تم الاحتفاظ ببياناتك الأصلية.');

  cleanupSidecars(dbPath);
  fs.copyFileSync(tempPath, dbPath);
  cleanupSidecars(tempPath);
  try { fs.rmSync(tempPath, { force:true }); } catch {}

  if (!canOpenCurrent(dbPath)) {
    fs.copyFileSync(backupPath, dbPath);
    throw new Error('فشلت ترقية قاعدة البيانات وتمت استعادة النسخة الأصلية تلقائيًا.');
  }

  logger(`LEGACY REALM MIGRATED SUCCESSFULLY: trainees=${data.trainees.length}, subscriptions=${data.subscriptions.length}, payments=${data.payments.length}`);
  return { repaired:true, backupPath };
}

function createLegacyFixture(dbPath) {
  cleanupSidecars(dbPath);
  try { fs.rmSync(dbPath, { force:true }); } catch {}
  let realm;
  const now = new Date('2026-08-12T00:00:00Z');
  try {
    realm = new Realm({ path:dbPath, schema:LEGACY_SCHEMAS, schemaVersion:1 });
    realm.write(() => {
      realm.create('Trainee',{id:'legacy-trainee',name:'متدرب اختبار الهجرة',country:'مصر',countryCode:'+20',phone:'01012345678',normalizedPhone:'+201012345678',whatsappEnabled:true,notes:null,archived:false,createdAt:now,updatedAt:now});
      realm.create('MembershipPlan',{id:'bodybuilding',name:'كمال أجسام',monthlyPrice:333,active:true,createdAt:now,updatedAt:now});
      realm.create('Subscription',{id:'legacy-sub',traineeId:'legacy-trainee',planId:'bodybuilding',planNameSnapshot:'كمال أجسام',monthlyPriceSnapshot:333,numberOfMonths:2,totalAmount:666,startDate:now,endDate:new Date('2026-10-11T00:00:00Z'),createdAt:now,updatedAt:now});
      realm.create('Payment',{id:'legacy-payment',subscriptionId:'legacy-sub',traineeId:'legacy-trainee',amount:100,paymentDate:now,method:null,note:null,createdAt:now});
      realm.create('WhatsAppReminder',{id:'legacy-reminder',traineeId:'legacy-trainee',subscriptionId:'legacy-sub',phone:'+201012345678',scheduledDate:new Date('2026-10-09T00:00:00Z'),sentAt:null,status:'pending',message:'رسالة اختبار',errorMessage:null,createdAt:now,updatedAt:now});
      realm.create('AppSettings',{id:'app',gymName:'جيم اختبار الهجرة',currency:'جنيه',reminderDays:3,whatsappMode:'manual',whatsappAutoSend:false,whatsappMessageTemplate:'أهلاً {name}',graphVersion:'v26.0',phoneNumberId:'',whatsappTemplateName:'',whatsappTemplateLanguage:'ar',createdAt:now,updatedAt:now});
    });
  } finally {
    closeRealm(realm);
  }
}

module.exports = { repairLegacyRealmIfNeeded, createLegacyFixture };
