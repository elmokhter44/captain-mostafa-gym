(function(){
 'use strict';
 if(window.__MOBILE_GYM_BRIDGE__)return;
 window.__MOBILE_GYM_BRIDGE__=true;
 let seq=0;const pending={};
 window.__nativeGymResolve=function(id,payload){const p=pending[id];if(!p)return;delete pending[id];p.resolve(payload)};
 function call(method,args){return new Promise((resolve)=>{const id='m'+(++seq)+'_'+Date.now();pending[id]={resolve};const send=()=>{if(window.ReactNativeWebView&&window.ReactNativeWebView.postMessage){window.ReactNativeWebView.postMessage(JSON.stringify({id,method,args:args||[]}));return true}return false};if(!send()){let attempts=0;const timer=setInterval(()=>{attempts++;if(send()){clearInterval(timer)}else if(attempts>100){clearInterval(timer);if(pending[id]){delete pending[id];resolve({ok:false,error:'تعذر الاتصال بالتطبيق'})}}},20)}setTimeout(()=>{if(pending[id]){delete pending[id];resolve({ok:false,error:'انتهت مهلة الاتصال بالتطبيق'})}},30000)})}
 window.gymAPI={
  bootstrap:()=>call('bootstrap'),dashboard:()=>call('dashboard'),list:f=>call('list',[f]),get:id=>call('get',[id]),add:d=>call('add',[d]),update:(id,d)=>call('update',[id,d]),updateSubscription:(id,d)=>call('updateSubscription',[id,d]),archive:(id,v)=>call('archive',[id,v]),delete:id=>call('delete',[id]),payment:(t,s,a,m,n)=>call('payment',[t,s,a,m,n]),renew:(id,d)=>call('renew',[id,d]),plans:(all=false)=>call('plans',[all]),createPlan:d=>call('createPlan',[d]),updatePlan:(id,d)=>call('updatePlan',[id,d]),setPlanActive:(id,v)=>call('setPlanActive',[id,v]),settings:()=>call('settings'),saveSettings:d=>call('saveSettings',[d]),reminders:()=>call('reminders'),markReminder:(id,s,e)=>call('markReminder',[id,s,e]),whatsapp:(p,m,r)=>call('whatsapp',[p,m,r]),backup:()=>call('backup'),restoreBackup:()=>call('restoreBackup'),exportCsv:()=>call('exportExcel'),openDataFolder:()=>call('openDataFolder'),authInfo:()=>call('authInfo'),changeCredentials:d=>call('changeCredentials',[d])
 };
})();
