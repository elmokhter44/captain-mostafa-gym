'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./db');

let mainWindow;
let realmPath;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'Captain Mostafa Gym',
    backgroundColor: '#f4f8f7',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
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

app.whenReady().then(() => {
  realmPath = path.join(app.getPath('userData'),'captain-mostafa-gym.realm');
  db.open(realmPath);
  registerIpc();
  createWindow();
  app.on('activate',()=>{ if(BrowserWindow.getAllWindows().length===0) createWindow(); });
});

app.on('window-all-closed',()=>{ if(process.platform!=='darwin') app.quit(); });
