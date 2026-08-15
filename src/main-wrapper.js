'use strict';

const { app, ipcMain, dialog } = require('electron');
const path = require('path');
const db = require('./db-pro');
const { exportTraineesExcel } = require('./excel-export');
const { prepareRestore, applyPendingRestore } = require('./backup-restore');

function restoreLog(message) {
  try { console.error(`[RESTORE] ${message}`); } catch {}
}

// This callback is registered before main.js registers its app.whenReady() boot callback,
// so a pending restore is applied before RealmDB is opened by the application.
app.whenReady().then(() => {
  try {
    const result = applyPendingRestore(app.getPath('userData'), restoreLog);
    if (result.applied) restoreLog('Pending backup restore completed before application boot.');
  } catch (error) {
    restoreLog(error?.stack || error?.message || String(error));
    try { dialog.showErrorBox('تعذر استعادة النسخة الاحتياطية', error?.message || String(error)); } catch {}
  }
});

async function startRestore(win) {
  try {
    const selected = await dialog.showOpenDialog(win, {
      title:'استعادة نسخة احتياطية',
      properties:['openFile'],
      filters:[
        {name:'Realm Backup',extensions:['realm','bak']},
        {name:'All Files',extensions:['*']}
      ]
    });
    if (selected.canceled || !selected.filePaths?.[0]) return;

    const confirm = await dialog.showMessageBox(win, {
      type:'warning',
      title:'تأكيد استعادة النسخة الاحتياطية',
      message:'هل تريد استعادة هذه النسخة الاحتياطية؟',
      detail:'سيتم التحقق من الملف أولًا، ثم إنشاء نسخة أمان تلقائية من بياناتك الحالية قبل الاستعادة. سيعاد تشغيل البرنامج بعد نجاح العملية.',
      buttons:['استعادة النسخة','إلغاء'],
      defaultId:1,
      cancelId:1,
      noLink:true
    });
    if (confirm.response !== 0) return;

    prepareRestore(selected.filePaths[0], app.getPath('userData'), restoreLog);

    await dialog.showMessageBox(win, {
      type:'info',
      title:'تم تجهيز الاستعادة',
      message:'تم التحقق من النسخة الاحتياطية بنجاح.',
      detail:'سيتم إعادة تشغيل البرنامج الآن وتطبيق البيانات المستعادة. استخدم بيانات تسجيل الدخول الموجودة داخل النسخة الاحتياطية بعد إعادة التشغيل.',
      buttons:['موافق'],
      defaultId:0,
      noLink:true
    });

    app.relaunch();
    app.exit(0);
  } catch (error) {
    restoreLog(error?.stack || error?.message || String(error));
    try {
      await dialog.showMessageBox(win, {
        type:'error',
        title:'فشل استعادة النسخة الاحتياطية',
        message:'لم يتم تغيير بياناتك الحالية.',
        detail:error?.message || String(error),
        buttons:['موافق'],
        defaultId:0,
        noLink:true
      });
    } catch {}
  }
}

// Add one restore button to the existing Settings toolbar without changing the current design.
app.on('browser-window-created', (_event, win) => {
  win.webContents.on('will-navigate', (event, url) => {
    if (String(url).startsWith('gymrestore://backup')) {
      event.preventDefault();
      startRestore(win);
    }
  });

  win.webContents.on('did-finish-load', async () => {
    const url = win.webContents.getURL();
    if (!url.endsWith('/index.html') && !url.endsWith('\\index.html')) return;
    try {
      await win.webContents.executeJavaScript(`(() => {
        if (document.getElementById('restoreBackupBtn')) return true;
        const backup = document.getElementById('backupBtn');
        if (!backup) return false;
        const btn = document.createElement('button');
        btn.id = 'restoreBackupBtn';
        btn.type = 'button';
        btn.className = backup.className;
        btn.textContent = 'استعادة نسخة احتياطية';
        btn.addEventListener('click', () => { window.location.href = 'gymrestore://backup'; });
        backup.insertAdjacentElement('afterend', btn);
        return true;
      })()`);
    } catch (error) {
      restoreLog(`Failed to inject restore button: ${error?.message || error}`);
    }
  });
});

const originalHandle = ipcMain.handle.bind(ipcMain);

ipcMain.handle = function patchedHandle(channel, listener) {
  if (channel === 'gym:export-csv') {
    return originalHandle('gym:export-excel', async () => {
      try {
        const result = await dialog.showSaveDialog({
          title:'تصدير بيانات المتدربين Excel',
          defaultPath:`trainees-${new Date().toISOString().slice(0,10)}.xlsx`,
          filters:[{name:'Excel Workbook',extensions:['xlsx']}]
        });
        if (result.canceled || !result.filePath) return {ok:true,data:false};
        exportTraineesExcel(result.filePath, db.exportRows(), db.settings());
        return {ok:true,data:result.filePath};
      } catch (error) {
        console.error('gym:export-excel',error);
        return {ok:false,error:error?.message||'تعذر تصدير ملف Excel'};
      }
    });
  }
  return originalHandle(channel, listener);
};

require('./main');
