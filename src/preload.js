'use strict';
const { contextBridge, ipcRenderer } = require('electron');
const call=(channel,...args)=>ipcRenderer.invoke(channel,...args);

contextBridge.exposeInMainWorld('__GYM_AUTH_SETTINGS_PAGE__',true);
contextBridge.exposeInMainWorld('gymAPI',{
  bootstrap:()=>call('gym:bootstrap'), dashboard:()=>call('gym:dashboard'), list:f=>call('gym:list',f), get:id=>call('gym:get',id),
  add:d=>call('gym:add',d), update:(id,d)=>call('gym:update',id,d), updateSubscription:(id,d)=>call('gym:update-subscription',id,d),
  archive:(id,v)=>call('gym:archive',id,v), delete:id=>call('gym:delete',id), payment:(t,s,a,m,n)=>call('gym:payment',t,s,a,m,n), renew:(id,d)=>call('gym:renew',id,d),
  plans:(all=false)=>call('gym:plans',all), createPlan:d=>call('gym:plan-create',d), updatePlan:(id,d)=>call('gym:plan-update',id,d), setPlanActive:(id,v)=>call('gym:plan-active',id,v),
  settings:()=>call('gym:settings'), saveSettings:d=>call('gym:save-settings',d), reminders:()=>call('gym:reminders'), markReminder:(id,s,e)=>call('gym:reminder-mark',id,s,e),
  whatsapp:(p,m,r)=>call('gym:whatsapp',p,m,r), backup:()=>call('gym:backup'), exportCsv:()=>call('gym:export-csv'), openDataFolder:()=>call('gym:open-data-folder'),
  authInfo:()=>call('auth:info'), changeCredentials:d=>call('auth:change',d)
});

function loadResponsiveStyles(){
  if(document.querySelector('link[data-responsive-styles]'))return;
  const link=document.createElement('link');link.rel='stylesheet';link.href='responsive.css';link.dataset.responsiveStyles='true';document.head.appendChild(link);
}

function injectSettingsPages(){
  if(document.getElementById('settingsPageNav'))return;
  const settings=document.getElementById('settings');
  const layout=settings?.querySelector('.settings-layout');
  const title=settings?.querySelector('.page-title');
  if(!settings||!layout||!title)return;

  const nav=document.createElement('div');
  nav.id='settingsPageNav';
  nav.className='settings-subnav';
  nav.innerHTML=`
    <button type="button" class="settings-subnav-btn active" data-settings-target="settingsGeneralPage">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3.9a7 7 0 0 0-1.7-1L14.5 3h-5L9 6a7 7 0 0 0-1.7 1L5 6.1 3 9.5 5.1 11a7 7 0 0 0 0 2L3 14.5 5 18l2.3-1a7 7 0 0 0 1.7 1l.5 3h5l.5-3a7 7 0 0 0 1.7-1l2.3 1 2-3.5-2.1-1.5a7 7 0 0 0 .1-1z"/></svg>
      <span><b>إعدادات النظام والخطط</b><small>الخطط والأسعار والنسخ الاحتياطي والتصدير</small></span>
    </button>
    <button type="button" class="settings-subnav-btn" data-settings-target="settingsLoginPage">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v2"/></svg>
      <span><b>بيانات تسجيل الدخول</b><small>تغيير اسم المستخدم وكلمة المرور</small></span>
    </button>`;
  title.insertAdjacentElement('afterend',nav);

  const general=document.createElement('div');general.id='settingsGeneralPage';general.className='settings-subpage active';
  layout.parentNode.insertBefore(general,layout);general.appendChild(layout);

  const loginPage=document.createElement('div');loginPage.id='settingsLoginPage';loginPage.className='settings-subpage';
  loginPage.innerHTML=`
    <div class="auth-page-card">
      <div class="auth-page-head">
        <div class="auth-page-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v2"/></svg></div>
        <div><h3>بيانات تسجيل الدخول</h3><p>يمكنك تغيير اسم المستخدم أو كلمة المرور الخاصة بفتح البرنامج.</p></div>
      </div>
      <form id="authSettingsForm" class="auth-form">
        <div class="form-grid">
          <div class="field"><label>اسم المستخدم</label><input id="authNewUsername" autocomplete="username" required></div>
          <div class="field"><label>كلمة المرور الحالية *</label><input id="authCurrentPassword" type="password" autocomplete="current-password" required></div>
          <div class="field"><label>كلمة المرور الجديدة</label><input id="authNewPassword" type="password" autocomplete="new-password" placeholder="اتركها فارغة للإبقاء على الحالية"></div>
          <div class="field"><label>تأكيد كلمة المرور الجديدة</label><input id="authConfirmPassword" type="password" autocomplete="new-password" placeholder="أعد كتابة كلمة المرور الجديدة"></div>
        </div>
        <div class="auth-form-actions"><button class="btn btn-primary" type="submit">حفظ بيانات الدخول</button><span id="authSettingsMessage"></span></div>
      </form>
    </div>`;
  general.insertAdjacentElement('afterend',loginPage);

  const buttons=[...nav.querySelectorAll('[data-settings-target]')];
  const switchPage=async target=>{
    buttons.forEach(b=>b.classList.toggle('active',b.dataset.settingsTarget===target));
    [general,loginPage].forEach(p=>p.classList.toggle('active',p.id===target));
    if(target==='settingsLoginPage'){
      try{const r=await call('auth:info');if(r?.ok)loginPage.querySelector('#authNewUsername').value=r.data?.username||''}catch{}
    }
  };
  buttons.forEach(b=>b.addEventListener('click',()=>switchPage(b.dataset.settingsTarget)));

  const username=loginPage.querySelector('#authNewUsername'),current=loginPage.querySelector('#authCurrentPassword'),next=loginPage.querySelector('#authNewPassword'),confirm=loginPage.querySelector('#authConfirmPassword'),message=loginPage.querySelector('#authSettingsMessage'),form=loginPage.querySelector('#authSettingsForm');
  form.addEventListener('submit',async e=>{
    e.preventDefault();message.textContent='';message.className='';
    if(next.value!==confirm.value){message.className='auth-msg error';message.textContent='تأكيد كلمة المرور الجديدة غير مطابق';return}
    try{
      const r=await call('auth:change',{currentPassword:current.value,newUsername:username.value.trim(),newPassword:next.value});
      if(!r?.ok)throw new Error(r?.error||'تعذر حفظ بيانات الدخول');
      username.value=r.data?.username||username.value;current.value='';next.value='';confirm.value='';message.className='auth-msg success';message.textContent='تم حفظ بيانات الدخول بنجاح';
      setTimeout(()=>{message.textContent='';message.className=''},3500);
    }catch(error){message.className='auth-msg error';message.textContent=error?.message||'تعذر حفظ بيانات الدخول'}
  });
}

window.addEventListener('DOMContentLoaded',()=>{loadResponsiveStyles();setTimeout(injectSettingsPages,0);setTimeout(injectSettingsPages,500)});
