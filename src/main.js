'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const migration = require('./migration');

const forcedUserData = process.env.GYM_TEST_USER_DATA;
if (forcedUserData) {
  fs.mkdirSync(forcedUserData, { recursive: true });
  app.setPath('userData', forcedUserData);
}

let mainWindow;
let realmPath;
const isSmokeTest = process.argv.includes('--smoke-test');
const createLegacyFixture = process.argv.includes('--create-legacy-fixture');
const verifyLegacyMigration = process.argv.includes('--verify-legacy-migration');

function tempLogPath() {
  try { return path.join(app.getPath('temp'), 'captain-mostafa-gym-startup.log'); }
  catch { return path.join(process.env.TEMP || process.cwd(), 'captain-mostafa-gym-startup.log'); }
}

function logStartup(message, error) {
  const line = `[${new Date().toISOString()}] ${message}${error ? `\n${error.stack || error.message || error}` : ''}\n`;
  try { fs.appendFileSync(tempLogPath(), line, 'utf8'); } catch {}
  try {
    if (app.isReady()) fs.appendFileSync(path.join(app.getPath('userData'), 'startup.log'), line, 'utf8');
  } catch {}
  console.error(line);
}

process.on('uncaughtException', error => logStartup('UNCAUGHT EXCEPTION', error));
process.on('unhandledRejection', error => logStartup('UNHANDLED REJECTION', error));

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'Captain Mostafa Gym',
    backgroundColor: '#f4f8f7',
    autoHideMenuBar: true,
    show: !isSmokeTest,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.webContents.on('did-fail-load', (_event, code, description) => {
    logStartup(`RENDERER FAILED TO LOAD (${code}): ${description}`);
  });

  if (isSmokeTest) {
    mainWindow.webContents.once('did-finish-load', () => {
      try {
        const marker = path.join(app.getPath('temp'), 'captain-mostafa-gym-smoke-ok.txt');
        fs.writeFileSync(marker, `OK ${new Date().toISOString()}`, 'utf8');
        logStartup('PACKAGED SMOKE TEST PASSED');
      } catch (error) {
        logStartup('FAILED TO WRITE SMOKE TEST MARKER', error);
      }
      setTimeout(() => app.quit(), 300);
    });
  }

  mainWindow.loadFile(path.join(__dirname, 'index.html')).catch(error => logStartup('FAILED TO LOAD INDEX.HTML', error));
  return mainWindow;
}

function safeHandle(channel, fn) {
  ipcMain.handle(channel, async (_event, ...args) => {
    try { return { ok: true, data: await fn(...args) }; }
    catch (error) { console.error(channel, error); return { ok: false, error: error?.message || 'حدث خطأ غير متوقع' }; }
  });
}

function registerIpc() {
  safeHandle('gym:bootstrap', () => ({ dashboard: db.dashboard(), trainees: db.listTrainees(), plans: db.plans(), settings: db.settings(), reminders: db.dueReminders() }));
  safeHandle('gym:dashboard', () => db.dashboard());
  safeHandle('gym:list', filters => db.listTrainees(filters));
  safeHandle('gym:get', id => db.getTrainee(id));
  safeHandle('gym:add', data => db.addTrainee(data));
  safeHandle('gym:update', (id,data) => db.updateTrainee(id,data));
  safeHandle('gym:archive', (id,value) => db.archiveTrainee(id,value));
  safeHandle('gym:delete', id => db.deleteTrainee(id));
  safeHandle('gym:payment', (traineeId,subscriptionId,amount,method,note) => db.addPayment(traineeId,subscriptionId,amount,method,note));
  safeHandle('gym:renew', (id,data) => db.renew(id,data));
  safeHandle('gym:plans', () => db.plans());
  safeHandle('gym:plan-price', (id,price) => db.updatePlan(id,price));
  safeHandle('gym:settings', () => db.settings());
  safeHandle('gym:save-settings', data => db.saveSettings(data));
  safeHandle('gym:reminders', () => db.dueReminders());
  safeHandle('gym:reminder-mark', (id,status,error) => db.markReminder(id,status,error));
  safeHandle('gym:whatsapp', async (phone,message,reminderId) => {
    const normalized = String(phone||'').replace(/[^\d]/g,'');
    if (!normalized) throw new Error('رقم واتساب غير صحيح');
    const url = `https://wa.me/${normalized}?text=${encodeURIComponent(message||'')}`;
    await shell.openExternal(url);
    if (reminderId) db.markReminder(reminderId,'sent');
    return true;
  });
  safeHandle('gym:backup', async () => {
    const result = await dialog.showSaveDialog(mainWindow,{ title:'حفظ نسخة احتياطية', defaultPath:`gym-backup-${new Date().toISOString().slice(0,10)}.realm`, filters:[{name:'Realm Backup',extensions:['realm']}] });
    if (result.canceled || !result.filePath) return false;
    fs.copyFileSync(realmPath,result.filePath); return result.filePath;
  });
  safeHandle('gym:open-data-folder', async () => { await shell.openPath(app.getPath('userData')); return true; });
}

function verifyMigratedFixture() {
  const t = db.getTrainee('legacy-trainee');
  const p = db.plans().find(x => x.id === 'bodybuilding');
  const s = db.settings();
  if (!t) throw new Error('Legacy trainee was not preserved');
  if (t.notes !== '') throw new Error('Nullable trainee notes were not normalized');
  if (!t.subscriptions?.length || t.subscriptions[0].planName !== 'كمال أجسام' || t.subscriptions[0].months !== 2) throw new Error('Legacy subscription fields were not migrated');
  if (!t.payments?.length || t.payments[0].method !== 'نقدي' || t.payments[0].note !== '') throw new Error('Legacy payment nullable fields were not migrated');
  if (!p || p.monthlyPrice !== 333) throw new Error('Legacy plan price was not preserved');
  if (s.gymName !== 'جيم اختبار الهجرة' || s.reminderDays !== '3') throw new Error('Legacy settings were not preserved');
  const marker = path.join(app.getPath('temp'), 'captain-mostafa-gym-migration-ok.txt');
  fs.writeFileSync(marker, `OK ${new Date().toISOString()}`, 'utf8');
  logStartup('LEGACY MIGRATION VERIFICATION PASSED');
}

async function boot() {
  try {
    logStartup(`BOOT START packaged=${app.isPackaged} smoke=${isSmokeTest} electron=${process.versions.electron}`);
    realmPath = path.join(app.getPath('userData'),'captain-mostafa-gym.realm');

    if (createLegacyFixture) {
      migration.createLegacyFixture(realmPath);
      logStartup(`LEGACY TEST FIXTURE CREATED: ${realmPath}`);
      app.exit(0);
      return;
    }

    logStartup(`CHECKING REALM SCHEMA: ${realmPath}`);
    migration.repairLegacyRealmIfNeeded(realmPath, message => logStartup(message));

    logStartup(`OPENING REALM: ${realmPath}`);
    db.open(realmPath);
    logStartup('REALM OPENED SUCCESSFULLY');

    if (verifyLegacyMigration) {
      verifyMigratedFixture();
      app.exit(0);
      return;
    }

    registerIpc();
    createWindow();
    logStartup('MAIN WINDOW CREATED');
    app.on('activate',()=>{ if(BrowserWindow.getAllWindows().length===0) createWindow(); });
  } catch (error) {
    logStartup('FATAL STARTUP ERROR', error);
    if (!isSmokeTest && !createLegacyFixture && !verifyLegacyMigration) {
      try {
        dialog.showErrorBox('تعذر تشغيل برنامج الجيم', `حدث خطأ أثناء بدء البرنامج.\n\n${error?.message || error}\n\nتم حفظ التفاصيل في ملف startup.log.`);
      } catch {}
    }
    app.exit(1);
  }
}

app.whenReady().then(boot).catch(error => {
  logStartup('APP READY FAILED', error);
  app.exit(1);
});

app.on('window-all-closed',()=>{ if(process.platform!=='darwin') app.quit(); });
