'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const call = (channel,...args) => ipcRenderer.invoke(channel,...args);
contextBridge.exposeInMainWorld('gymAPI', {
  bootstrap:()=>call('gym:bootstrap'), dashboard:()=>call('gym:dashboard'), list:f=>call('gym:list',f), get:id=>call('gym:get',id),
  add:d=>call('gym:add',d), update:(id,d)=>call('gym:update',id,d), archive:(id,v)=>call('gym:archive',id,v), delete:id=>call('gym:delete',id),
  payment:(t,s,a,m,n)=>call('gym:payment',t,s,a,m,n), renew:(id,d)=>call('gym:renew',id,d), plans:()=>call('gym:plans'),
  updatePlan:(id,p)=>call('gym:plan-price',id,p), settings:()=>call('gym:settings'), saveSettings:d=>call('gym:save-settings',d),
  reminders:()=>call('gym:reminders'), markReminder:(id,s,e)=>call('gym:reminder-mark',id,s,e), whatsapp:(p,m,r)=>call('gym:whatsapp',p,m,r),
  backup:()=>call('gym:backup'), openDataFolder:()=>call('gym:open-data-folder')
});
