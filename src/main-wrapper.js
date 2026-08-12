'use strict';

const { ipcMain, dialog } = require('electron');
const db = require('./db-pro');
const { exportTraineesExcel } = require('./excel-export');

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
