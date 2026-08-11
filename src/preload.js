'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const call=(channel,...args)=>ipcRenderer.invoke(channel,...args);
contextBridge.exposeInMainWorld('gymAPI',{
  bootstrap:()=>call('gym:bootstrap'), dashboard:()=>call('gym:dashboard'), list:f=>call('gym:list',f), get:id=>call('gym:get',id),
  add:d=>call('gym:add',d), update:(id,d)=>call('gym:update',id,d), updateSubscription:(id,d)=>call('gym:update-subscription',id,d),
  archive:(id,v)=>call('gym:archive',id,v), delete:id=>call('gym:delete',id), payment:(t,s,a,m,n)=>call('gym:payment',t,s,a,m,n), renew:(id,d)=>call('gym:renew',id,d),
  plans:(all=false)=>call('gym:plans',all), createPlan:d=>call('gym:plan-create',d), updatePlan:(id,d)=>call('gym:plan-update',id,d), setPlanActive:(id,v)=>call('gym:plan-active',id,v),
  settings:()=>call('gym:settings'), saveSettings:d=>call('gym:save-settings',d), reminders:()=>call('gym:reminders'), markReminder:(id,s,e)=>call('gym:reminder-mark',id,s,e),
  whatsapp:(p,m,r)=>call('gym:whatsapp',p,m,r), backup:()=>call('gym:backup'), exportCsv:()=>call('gym:export-csv'), openDataFolder:()=>call('gym:open-data-folder')
});
