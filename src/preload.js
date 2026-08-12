'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const call=(channel,...args)=>ipcRenderer.invoke(channel,...args);

contextBridge.exposeInMainWorld('gymAPI',{
  bootstrap:()=>call('gym:bootstrap'), dashboard:()=>call('gym:dashboard'), list:f=>call('gym:list',f), get:id=>call('gym:get',id),
  add:d=>call('gym:add',d), update:(id,d)=>call('gym:update',id,d), updateSubscription:(id,d)=>call('gym:update-subscription',id,d),
  archive:(id,v)=>call('gym:archive',id,v), delete:id=>call('gym:delete',id), payment:(t,s,a,m,n)=>call('gym:payment',t,s,a,m,n), renew:(id,d)=>call('gym:renew',id,d),
  plans:(all=false)=>call('gym:plans',all), createPlan:d=>call('gym:plan-create',d), updatePlan:(id,d)=>call('gym:plan-update',id,d), setPlanActive:(id,v)=>call('gym:plan-active',id,v),
  settings:()=>call('gym:settings'), saveSettings:d=>call('gym:save-settings',d), reminders:()=>call('gym:reminders'), markReminder:(id,s,e)=>call('gym:reminder-mark',id,s,e),
  whatsapp:(p,m,r)=>call('gym:whatsapp',p,m,r), backup:()=>call('gym:backup'), exportCsv:()=>call('gym:export-csv'), openDataFolder:()=>call('gym:open-data-folder'),
  authInfo:()=>call('auth:info'), changeCredentials:d=>call('auth:change',d)
});

function injectLoginSettings(){
  if(document.getElementById('authSettingsSection'))return;
  const panel=document.querySelector('#settings .panel')||document.querySelector('#settings');
  if(!panel)return;
  const section=document.createElement('div');
  section.id='authSettingsSection';
  section.innerHTML=`
    <hr style="border:0;border-top:1px solid var(--line,#e7eeec);margin:26px 0 22px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <div style="width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,#19a974,#2878e3);color:#fff;font-size:18px">🔐</div>
      <div><h2 style="margin:0;font-size:17px">بيانات تسجيل الدخول</h2><div style="font-size:11px;color:#75858d;margin-top:3px">تعديل اسم المستخدم أو كلمة المرور الخاصة بفتح البرنامج</div></div>
    </div>
    <form id="authSettingsForm" style="margin-top:18px">
      <div class="form-grid">
        <div class="field"><label>اسم المستخدم</label><input id="authNewUsername" autocomplete="username" required></div>
        <div class="field"><label>كلمة المرور الحالية *</label><input id="authCurrentPassword" type="password" autocomplete="current-password" required></div>
        <div class="field"><label>كلمة المرور الجديدة</label><input id="authNewPassword" type="password" autocomplete="new-password" placeholder="اتركها فارغة للإبقاء على الحالية"></div>
        <div class="field"><label>تأكيد كلمة المرور الجديدة</label><input id="authConfirmPassword" type="password" autocomplete="new-password" placeholder="أعد كتابة كلمة المرور الجديدة"></div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin-top:16px;flex-wrap:wrap">
        <button class="btn primary" type="submit">حفظ بيانات الدخول</button>
        <span id="authSettingsMessage" style="font-size:12px"></span>
      </div>
    </form>`;
  panel.appendChild(section);
  const username=section.querySelector('#authNewUsername'),current=section.querySelector('#authCurrentPassword'),next=section.querySelector('#authNewPassword'),confirm=section.querySelector('#authConfirmPassword'),message=section.querySelector('#authSettingsMessage'),form=section.querySelector('#authSettingsForm');
  call('auth:info').then(r=>{if(r?.ok)username.value=r.data?.username||''}).catch(()=>{});
  form.addEventListener('submit',async e=>{
    e.preventDefault();message.textContent='';
    if(next.value!==confirm.value){message.style.color='#c43939';message.textContent='تأكيد كلمة المرور الجديدة غير مطابق';return}
    try{
      const r=await call('auth:change',{currentPassword:current.value,newUsername:username.value.trim(),newPassword:next.value});
      if(!r?.ok)throw new Error(r?.error||'تعذر حفظ بيانات الدخول');
      username.value=r.data?.username||username.value;current.value='';next.value='';confirm.value='';message.style.color='#0a8b5c';message.textContent='تم حفظ بيانات الدخول بنجاح';
      setTimeout(()=>{message.textContent=''},3500);
    }catch(error){message.style.color='#c43939';message.textContent=error?.message||'تعذر حفظ بيانات الدخول'}
  });
}

window.addEventListener('DOMContentLoaded',()=>{setTimeout(injectLoginSettings,0);setTimeout(injectLoginSettings,700)});
