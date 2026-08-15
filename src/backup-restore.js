'use strict';

const fs = require('fs');
const path = require('path');
const Realm = require('realm');
const schemas = require('./schema-current');
const migration = require('./migration');

const MARKER_NAME = 'pending-restore.json';
const DB_NAME = 'captain-mostafa-gym.realm';

function cleanupSidecars(realmPath) {
  for (const suffix of ['.lock', '.note', '.management']) {
    try { fs.rmSync(`${realmPath}${suffix}`, { recursive:true, force:true }); } catch {}
  }
}

function canOpenCurrent(filePath) {
  let realm;
  try {
    realm = new Realm({ path:filePath, schema:schemas, schemaVersion:1 });
    return true;
  } catch {
    return false;
  } finally {
    try { if (realm && !realm.isClosed) realm.close(); } catch {}
  }
}

function markerPath(userDataDir) {
  return path.join(userDataDir, MARKER_NAME);
}

function prepareRestore(sourcePath, userDataDir, logger=()=>{}) {
  if (!sourcePath || !fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
    throw new Error('ملف النسخة الاحتياطية غير موجود أو غير صالح.');
  }
  fs.mkdirSync(userDataDir, { recursive:true });
  const stamp = Date.now();
  const candidatePath = path.join(userDataDir, `restore-candidate-${stamp}.realm`);
  cleanupSidecars(candidatePath);
  fs.copyFileSync(sourcePath, candidatePath);
  logger(`RESTORE CANDIDATE COPIED: ${candidatePath}`);

  try {
    migration.repairLegacyRealmIfNeeded(candidatePath, logger);
    if (!canOpenCurrent(candidatePath)) throw new Error('تعذر فتح النسخة الاحتياطية كقاعدة بيانات Realm صالحة.');
    const marker = { candidatePath, sourceName:path.basename(sourcePath), createdAt:new Date().toISOString() };
    fs.writeFileSync(markerPath(userDataDir), JSON.stringify(marker), 'utf8');
    logger('RESTORE CANDIDATE VALIDATED AND MARKED FOR NEXT START');
    return marker;
  } catch (error) {
    cleanupSidecars(candidatePath);
    try { fs.rmSync(candidatePath, { force:true }); } catch {}
    throw new Error(`تعذر استخدام النسخة الاحتياطية: ${error?.message || error}`);
  }
}

function applyPendingRestore(userDataDir, logger=()=>{}) {
  const pendingPath = markerPath(userDataDir);
  if (!fs.existsSync(pendingPath)) return { applied:false };

  let marker;
  try { marker = JSON.parse(fs.readFileSync(pendingPath, 'utf8')); }
  catch {
    try { fs.rmSync(pendingPath, { force:true }); } catch {}
    throw new Error('ملف طلب الاستعادة تالف. لم يتم تغيير قاعدة البيانات الحالية.');
  }

  const candidatePath = path.resolve(String(marker.candidatePath || ''));
  const allowedRoot = path.resolve(userDataDir) + path.sep;
  if (!candidatePath.startsWith(allowedRoot) || !fs.existsSync(candidatePath) || !canOpenCurrent(candidatePath)) {
    try { fs.rmSync(pendingPath, { force:true }); } catch {}
    throw new Error('ملف الاستعادة المؤقت غير صالح. لم يتم تغيير قاعدة البيانات الحالية.');
  }

  const targetPath = path.join(userDataDir, DB_NAME);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safetyPath = `${targetPath}.before-restore-${stamp}.bak`;
  let safetyCreated = false;

  try {
    if (fs.existsSync(targetPath)) {
      fs.copyFileSync(targetPath, safetyPath);
      safetyCreated = true;
      logger(`CURRENT DATABASE SAFETY BACKUP CREATED: ${safetyPath}`);
    }
    cleanupSidecars(targetPath);
    fs.copyFileSync(candidatePath, targetPath);
    if (!canOpenCurrent(targetPath)) throw new Error('فشل التحقق من قاعدة البيانات بعد الاستعادة.');

    cleanupSidecars(candidatePath);
    try { fs.rmSync(candidatePath, { force:true }); } catch {}
    try { fs.rmSync(pendingPath, { force:true }); } catch {}
    logger('BACKUP RESTORE APPLIED SUCCESSFULLY');
    return { applied:true, targetPath, safetyPath:safetyCreated ? safetyPath : null };
  } catch (error) {
    try {
      cleanupSidecars(targetPath);
      if (safetyCreated && fs.existsSync(safetyPath)) fs.copyFileSync(safetyPath, targetPath);
    } catch {}
    try { fs.rmSync(pendingPath, { force:true }); } catch {}
    throw new Error(`فشلت الاستعادة وتم الحفاظ على بياناتك الحالية: ${error?.message || error}`);
  }
}

module.exports = { prepareRestore, applyPendingRestore, canOpenCurrent, MARKER_NAME, DB_NAME };
