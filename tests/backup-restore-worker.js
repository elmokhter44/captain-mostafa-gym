'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Realm = require('realm');
const schemas = require('../src/schema-current');
const migration = require('../src/migration');
const { prepareRestore, applyPendingRestore, MARKER_NAME, DB_NAME } = require('../src/backup-restore');

function writeCurrentRealm(filePath, gymName, traineeName) {
  let realm;
  try {
    realm = new Realm({ path:filePath, schema:schemas, schemaVersion:1 });
    realm.write(() => {
      realm.create('Setting',{key:'gymName',value:gymName},Realm.UpdateMode.Modified);
      if (traineeName) {
        const now = new Date('2026-08-15T00:00:00Z');
        realm.create('Trainee',{id:`t-${gymName}`,name:traineeName,country:'مصر',countryCode:'+20',phone:'01012345678',normalizedPhone:'+201012345678',whatsappEnabled:true,notes:'',archived:false,createdAt:now,updatedAt:now});
      }
    });
  } finally {
    try { if (realm && !realm.isClosed) realm.close(); } catch {}
  }
}

function readGymName(filePath) {
  let realm;
  try {
    realm = new Realm({ path:filePath, schema:schemas, schemaVersion:1 });
    return realm.objectForPrimaryKey('Setting','gymName')?.value || '';
  } finally {
    try { if (realm && !realm.isClosed) realm.close(); } catch {}
  }
}

try {
  {
    const root = fs.mkdtempSync(path.join(os.tmpdir(),'gym-restore-'));
    const userData = path.join(root,'userData');
    fs.mkdirSync(userData,{recursive:true});
    const current = path.join(userData,DB_NAME);
    const source = path.join(root,'backup.realm');
    writeCurrentRealm(current,'قبل الاستعادة','المتدرب القديم');
    writeCurrentRealm(source,'بعد الاستعادة','المتدرب المستعاد');
    const marker = prepareRestore(source,userData);
    assert.ok(fs.existsSync(path.join(userData,MARKER_NAME)));
    assert.ok(fs.existsSync(marker.candidatePath));
    assert.equal(readGymName(current),'قبل الاستعادة');
    const result = applyPendingRestore(userData);
    assert.equal(result.applied,true);
    assert.equal(readGymName(current),'بعد الاستعادة');
    assert.ok(result.safetyPath && fs.existsSync(result.safetyPath));
    assert.equal(readGymName(result.safetyPath),'قبل الاستعادة');
    assert.equal(fs.existsSync(path.join(userData,MARKER_NAME)),false);
  }

  {
    const root = fs.mkdtempSync(path.join(os.tmpdir(),'gym-restore-legacy-'));
    const userData = path.join(root,'userData');
    fs.mkdirSync(userData,{recursive:true});
    const source = path.join(root,'legacy.realm');
    migration.createLegacyFixture(source);
    prepareRestore(source,userData);
    const result = applyPendingRestore(userData);
    assert.equal(result.applied,true);
    let realm;
    try {
      realm = new Realm({ path:path.join(userData,DB_NAME), schema:schemas, schemaVersion:1 });
      assert.equal(realm.objectForPrimaryKey('Trainee','legacy-trainee')?.name,'متدرب اختبار الهجرة');
      assert.equal(realm.objectForPrimaryKey('Setting','gymName')?.value,'جيم اختبار الهجرة');
    } finally {
      try { if (realm && !realm.isClosed) realm.close(); } catch {}
    }
  }

  {
    const root = fs.mkdtempSync(path.join(os.tmpdir(),'gym-restore-invalid-'));
    const userData = path.join(root,'userData');
    fs.mkdirSync(userData,{recursive:true});
    const current = path.join(userData,DB_NAME);
    const bad = path.join(root,'bad.realm');
    writeCurrentRealm(current,'بيانات سليمة');
    fs.writeFileSync(bad,'not a realm database','utf8');
    assert.throws(()=>prepareRestore(bad,userData),/تعذر استخدام النسخة الاحتياطية/);
    assert.equal(readGymName(current),'بيانات سليمة');
    assert.equal(fs.existsSync(path.join(userData,MARKER_NAME)),false);
  }

  console.log('BACKUP RESTORE TESTS PASSED');
  setTimeout(()=>process.exit(0),50);
} catch (error) {
  console.error(error?.stack || error);
  setTimeout(()=>process.exit(1),50);
}
