'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./db-pro');
const migration = require('./migration');
const { createAuthService } = require('./auth');

const forcedUserData = process.env.GYM_TEST_USER_DATA;
if (forcedUserData) { fs.mkdirSync(forcedUserData,{recursive:true}); app.setPath('userData',forcedUserData); }

let mainWindow, loginWindow, realmPath, auth;
let authenticated = false;
const isSmokeTest = process.argv.includes('--smoke-test');
const featureSmokeTest = process.argv.includes('--feature-smoke-test');
const createLegacyFixture = process.argv.includes('--create-legacy-fixture');
const verifyLegacyMigration = process.argv.includes('--verify-legacy-migration');
const authSmokeTest = process.argv.includes('--auth-smoke-test');
const loginUiSmokeTest = process.argv.includes('--login-ui-smoke-test');

const AUTH_KEYS = new Set(['authUsername','authPasswordSalt','authPasswordHash']);

function tempLogPath(){try{return path.join(app.getPath('temp'),'captain-mostafa-gym-startup.log')}catch{return path.join(process.env.TEMP||process.cwd(),'captain-mostafa-gym-startup.log')}}
function logStartup(message,error){const line=`[${new Date().toISOString()}] ${message}${error?`\n${error.stack||error.message||error}`:''}\n`;try{fs.appendFileSync(tempLogPath(),line,'utf8')}catch{}try{if(app.isReady())fs.appendFileSync(path.join(app.getPath('userData'),'startup.log'),line,'utf8')}catch{}console.error(line)}
process.on('uncaughtException',e=>logStartup('UNCAUGHT EXCEPTION',e));
process.on('unhandledRejection',e=>logStartup('UNHANDLED REJECTION',e));

function publicSettings(){const s=db.settings();const out={};for(const [key,value] of Object.entries(s)){if(!AUTH_KEYS.has(key))out[key]=value}return out}
function savePublicSettings(input){const clean={};for(const [key,value] of Object.entries(input||{})){if(!AUTH_KEYS.has(key))clean[key]=value}db.saveSettings(clean);return publicSettings()}

function createWindow(){
  if(!authenticated && !isSmokeTest) throw new Error('يجب تسجيل الدخول قبل فتح البرنامج');
  if(mainWindow && !mainWindow.isDestroyed()){mainWindow.focus();return mainWindow}
  mainWindow=new BrowserWindow({width:1500,height:940,minWidth:1180,minHeight:720,title:'Captain Mostafa Gym',backgroundColor:'#f3f7f6',autoHideMenuBar:true,show:!isSmokeTest,webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:false}});
  mainWindow.webContents.on('did-fail-load',(_e,c,d)=>logStartup(`RENDERER FAILED TO LOAD (${c}): ${d}`));
  if(isSmokeTest)mainWindow.webContents.once('did-finish-load',async()=>{try{let report=null;for(let i=0;i<30;i++){report=await mainWindow.webContents.executeJavaScript('({ready:!!window.__GYM_UI_READY__,features:window.__GYM_UI_FEATURES__||null})');if(report?.ready)break;await new Promise(r=>setTimeout(r,200));}if(!report?.ready||!report.features?.hasCsv||!report.features?.hasPlans||!report.features?.hasEdit||report.features.buttons<15)throw new Error(`UI smoke report invalid: ${JSON.stringify(report)}`);fs.writeFileSync(path.join(app.getPath('temp'),'captain-mostafa-gym-smoke-ok.txt'),JSON.stringify(report),'utf8');logStartup(`PACKAGED UI SMOKE TEST PASSED ${JSON.stringify(report.features)}`);setTimeout(()=>app.quit(),200)}catch(e){logStartup('PACKAGED UI SMOKE TEST FAILED',e);app.exit(1)}});
  mainWindow.on('closed',()=>{mainWindow=null});
  mainWindow.loadFile(path.join(__dirname,'index.html')).catch(e=>logStartup('FAILED TO LOAD INDEX.HTML',e)); return mainWindow;
}

function createLoginWindow(){
  if(authenticated){return createWindow()}
  if(loginWindow && !loginWindow.isDestroyed()){loginWindow.focus();return loginWindow}
  loginWindow=new BrowserWindow({width:520,height:720,minWidth:500,minHeight:680,maxWidth:620,maxHeight:820,resizable:true,title:'تسجيل الدخول - Captain Mostafa Gym',backgroundColor:'#f3f7f6',autoHideMenuBar:true,show:!loginUiSmokeTest,webPreferences:{preload:path.join(__dirname,'login-preload.js'),contextIsolation:true,nodeIntegration:false,sandbox:false}});
  loginWindow.webContents.on('did-fail-load',(_e,c,d)=>logStartup(`LOGIN PAGE FAILED TO LOAD (${c}): ${d}`));
  loginWindow.webContents.once('did-finish-load',()=>{
    logStartup('LOGIN WINDOW LOADED');
    if(loginUiSmokeTest){try{const report={title:loginWindow.getTitle(),mainWindows:BrowserWindow.getAllWindows().filter(w=>w!==loginWindow).length};if(report.mainWindows!==0)throw new Error('Main application window opened before login');fs.writeFileSync(path.join(app.getPath('temp'),'captain-mostafa-gym-login-ui-ok.txt'),JSON.stringify(report),'utf8');logStartup('MANDATORY LOGIN UI SMOKE TEST PASSED');setTimeout(()=>app.quit(),200)}catch(e){logStartup('LOGIN UI SMOKE TEST FAILED',e);app.exit(1)}}
  });
  loginWindow.on('closed',()=>{loginWindow=null;if(!authenticated&&!loginUiSmokeTest)app.quit()});
  loginWindow.loadFile(path.join(__dirname,'login.html')).catch(e=>logStartup('FAILED TO LOAD LOGIN.HTML',e));
  return loginWindow;
}

function safeHandle(channel,fn){ipcMain.handle(channel,async(_event,...args)=>{try{if(!authenticated)throw new Error('يجب تسجيل الدخول أولًا');return{ok:true,data:await fn(...args)}}catch(error){console.error(channel,error);return{ok:false,error:error?.message||'حدث خطأ غير متوقع'}}})}
function csvCell(v){const s=String(v??'').replace(/"/g,'""');return `"${s}"`}
function csvText(rows){const headers=[['name','اسم المتدرب'],['country','البلد'],['countryCode','كود الدولة'],['phone','رقم الموبايل'],['normalizedPhone','رقم واتساب'],['plan','الخطة'],['monthlyPrice','سعر الشهر'],['months','عدد الأشهر'],['startDate','بداية الاشتراك'],['endDate','نهاية الاشتراك'],['status','الحالة'],['total','الإجمالي'],['paid','المدفوع'],['remaining','المتبقي'],['archived','مؤرشف'],['notes','ملاحظات']];return '\ufeff'+[headers.map(x=>csvCell(x[1])).join(','),...rows.map(r=>headers.map(x=>csvCell(r[x[0]])).join(','))].join('\r\n')}

function registerAuthIpc(){
  ipcMain.handle('auth:login',async(_event,{username,password}={})=>{try{if(!auth.verify(String(username||''),String(password||'')))return{ok:false,error:'اسم المستخدم أو كلمة المرور غير صحيحة'};authenticated=true;logStartup(`LOGIN SUCCESS username=${String(username||'')}`);setTimeout(()=>{try{if(loginWindow&&!loginWindow.isDestroyed())loginWindow.close();createWindow();logStartup('MAIN WINDOW CREATED AFTER LOGIN')}catch(e){logStartup('FAILED TO OPEN MAIN WINDOW AFTER LOGIN',e)}},120);return{ok:true,data:{username:String(username||'')}}}catch(error){logStartup('LOGIN ERROR',error);return{ok:false,error:error?.message||'تعذر تسجيل الدخول'}}});
  ipcMain.handle('auth:info',async()=>{try{if(!authenticated)throw new Error('يجب تسجيل الدخول أولًا');return{ok:true,data:auth.info()}}catch(error){return{ok:false,error:error?.message||'حدث خطأ'}}});
  ipcMain.handle('auth:change',async(_event,data)=>{try{if(!authenticated)throw new Error('يجب تسجيل الدخول أولًا');const result=auth.change(data);logStartup(`LOGIN CREDENTIALS CHANGED username=${result.username}`);return{ok:true,data:result}}catch(error){return{ok:false,error:error?.message||'تعذر تعديل بيانات الدخول'}}});
  ipcMain.handle('auth:reset-defaults',async()=>{try{const result=auth.resetToDefaults();authenticated=false;logStartup('LOGIN CREDENTIALS RESET TO DEFAULTS');return{ok:true,data:result}}catch(error){return{ok:false,error:error?.message||'تعذر استعادة بيانات الدخول'}}});
}

function registerIpc(){
  safeHandle('gym:bootstrap',()=>({dashboard:db.dashboard(),trainees:db.listTrainees(),plans:db.plans(),allPlans:db.plans(true),settings:publicSettings(),reminders:db.dueReminders()}));
  safeHandle('gym:dashboard',()=>db.dashboard()); safeHandle('gym:list',f=>db.listTrainees(f)); safeHandle('gym:get',id=>db.getTrainee(id));
  safeHandle('gym:add',d=>db.addTrainee(d)); safeHandle('gym:update',(id,d)=>db.updateTrainee(id,d)); safeHandle('gym:update-subscription',(id,d)=>db.updateCurrentSubscription(id,d));
  safeHandle('gym:archive',(id,v)=>db.archiveTrainee(id,v)); safeHandle('gym:delete',id=>db.deleteTrainee(id)); safeHandle('gym:payment',(t,s,a,m,n)=>db.addPayment(t,s,a,m,n)); safeHandle('gym:renew',(id,d)=>db.renew(id,d));
  safeHandle('gym:plans',(all=false)=>db.plans(all)); safeHandle('gym:plan-create',d=>db.createPlan(d)); safeHandle('gym:plan-update',(id,d)=>db.updatePlan(id,d)); safeHandle('gym:plan-active',(id,v)=>db.setPlanActive(id,v));
  safeHandle('gym:settings',()=>publicSettings()); safeHandle('gym:save-settings',d=>savePublicSettings(d)); safeHandle('gym:reminders',()=>db.dueReminders()); safeHandle('gym:reminder-mark',(id,s,e)=>db.markReminder(id,s,e));
  safeHandle('gym:whatsapp',async(phone,message,reminderId)=>{const normalized=String(phone||'').replace(/[^\d]/g,'');if(!normalized)throw new Error('رقم واتساب غير صحيح');await shell.openExternal(`https://wa.me/${normalized}?text=${encodeURIComponent(message||'')}`);if(reminderId)db.markReminder(reminderId,'sent');return true});
  safeHandle('gym:backup',async()=>{const r=await dialog.showSaveDialog(mainWindow,{title:'حفظ نسخة احتياطية',defaultPath:`gym-backup-${new Date().toISOString().slice(0,10)}.realm`,filters:[{name:'Realm Backup',extensions:['realm']}]});if(r.canceled||!r.filePath)return false;fs.copyFileSync(realmPath,r.filePath);return r.filePath});
  safeHandle('gym:export-csv',async()=>{const r=await dialog.showSaveDialog(mainWindow,{title:'تصدير بيانات المتدربين CSV',defaultPath:`trainees-${new Date().toISOString().slice(0,10)}.csv`,filters:[{name:'CSV',extensions:['csv']}]});if(r.canceled||!r.filePath)return false;fs.writeFileSync(r.filePath,csvText(db.exportRows()),'utf8');return r.filePath});
  safeHandle('gym:open-data-folder',async()=>{await shell.openPath(app.getPath('userData'));return true});
}

function verifyMigratedFixture(){const t=db.getTrainee('legacy-trainee'),p=db.plans().find(x=>x.id==='bodybuilding'),s=db.settings();if(!t)throw new Error('Legacy trainee was not preserved');if(t.notes!=='')throw new Error('Nullable trainee notes were not normalized');if(!t.subscriptions?.length||t.subscriptions[0].planName!=='كمال أجسام'||t.subscriptions[0].months!==2)throw new Error('Legacy subscription fields were not migrated');if(!t.payments?.length||t.payments[0].method!=='نقدي'||t.payments[0].note!=='')throw new Error('Legacy payment nullable fields were not migrated');if(!p||p.monthlyPrice!==333)throw new Error('Legacy plan price was not preserved');if(s.gymName!=='جيم اختبار الهجرة'||s.reminderDays!=='3')throw new Error('Legacy settings were not preserved');fs.writeFileSync(path.join(app.getPath('temp'),'captain-mostafa-gym-migration-ok.txt'),`OK ${new Date().toISOString()}`,'utf8');logStartup('LEGACY MIGRATION VERIFICATION PASSED')}
function runFeatureSmoke(){const plan=db.createPlan({name:'خطة اختبار الميزات',monthlyPrice:555});let t=db.addTrainee({name:'متدرب اختبار الميزات',country:'مصر',countryCode:'+20',phone:'01099998888',planId:plan.id,months:2,startDate:'2026-08-12',paid:100,method:'نقدي',notes:'قبل التعديل'});t=db.updateTrainee(t.id,{name:'متدرب اختبار معدل',country:'مصر',countryCode:'+20',phone:'01099998888',notes:'تم التعديل',whatsappEnabled:true});t=db.updateCurrentSubscription(t.id,{planId:plan.id,months:3,startDate:'2026-08-13'});db.addPayment(t.id,t.subscription.id,50,'InstaPay','اختبار دفعة');db.archiveTrainee(t.id,true);db.archiveTrainee(t.id,false);const rows=db.exportRows();const dash=db.dashboard();const final=db.getTrainee(t.id);if(final.name!=='متدرب اختبار معدل'||final.notes!=='تم التعديل')throw new Error('Edit trainee feature failed');if(final.subscription.months!==3||final.subscription.paid!==150)throw new Error('Subscription/payment feature failed');if(!rows.some(r=>r.name==='متدرب اختبار معدل'))throw new Error('CSV data feature failed');if(typeof dash.totalPaid!=='number'||typeof dash.remaining!=='number')throw new Error('Dashboard reports feature failed');db.deleteTrainee(t.id);db.setPlanActive(plan.id,false);fs.writeFileSync(path.join(app.getPath('temp'),'captain-mostafa-gym-feature-ok.txt'),`OK ${new Date().toISOString()}`,'utf8');logStartup('FULL FEATURE SMOKE TEST PASSED')}
function runAuthSmoke(){auth.ensureDefaults();if(!auth.verify('Admin','Admin'))throw new Error('Default Admin/Admin login failed');if(auth.verify('Admin','wrong'))throw new Error('Incorrect password was accepted');auth.change({currentPassword:'Admin',newUsername:'GymAdmin',newPassword:'Secure123'});if(auth.verify('Admin','Admin'))throw new Error('Old credentials still accepted after change');if(!auth.verify('GymAdmin','Secure123'))throw new Error('Changed credentials were not accepted');auth.resetToDefaults();if(!auth.verify('Admin','Admin'))throw new Error('Forgot-password reset to Admin/Admin failed');fs.writeFileSync(path.join(app.getPath('temp'),'captain-mostafa-gym-auth-ok.txt'),`OK ${new Date().toISOString()}`,'utf8');logStartup('MANDATORY LOGIN AUTHENTICATION SMOKE TEST PASSED')}

async function boot(){try{
  logStartup(`BOOT START packaged=${app.isPackaged} smoke=${isSmokeTest} electron=${process.versions.electron}`);
  realmPath=path.join(app.getPath('userData'),'captain-mostafa-gym.realm');
  if(createLegacyFixture){migration.createLegacyFixture(realmPath);logStartup(`LEGACY TEST FIXTURE CREATED: ${realmPath}`);app.exit(0);return}
  logStartup(`CHECKING REALM SCHEMA: ${realmPath}`);migration.repairLegacyRealmIfNeeded(realmPath,m=>logStartup(m));
  logStartup(`OPENING REALM: ${realmPath}`);db.open(realmPath);logStartup('REALM OPENED SUCCESSFULLY');
  auth=createAuthService(db);const authState=auth.ensureDefaults();if(authState.created)logStartup('DEFAULT LOGIN CREATED username=Admin');
  if(verifyLegacyMigration){verifyMigratedFixture();app.exit(0);return}
  if(featureSmokeTest){runFeatureSmoke();app.exit(0);return}
  if(authSmokeTest){runAuthSmoke();app.exit(0);return}
  registerAuthIpc();registerIpc();
  if(isSmokeTest){authenticated=true;createWindow();logStartup('MAIN WINDOW CREATED FOR INTERNAL SMOKE TEST');return}
  if(loginUiSmokeTest){createLoginWindow();return}
  createLoginWindow();logStartup('MANDATORY LOGIN WINDOW CREATED');
  app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0){if(authenticated)createWindow();else createLoginWindow()}})
}catch(error){logStartup('FATAL STARTUP ERROR',error);if(!isSmokeTest&&!createLegacyFixture&&!verifyLegacyMigration&&!featureSmokeTest&&!authSmokeTest&&!loginUiSmokeTest){try{dialog.showErrorBox('تعذر تشغيل برنامج الجيم',`حدث خطأ أثناء بدء البرنامج.\n\n${error?.message||error}\n\nتم حفظ التفاصيل في ملف startup.log.`)}catch{}}app.exit(1)}}

app.whenReady().then(boot).catch(e=>{logStartup('APP READY FAILED',e);app.exit(1)});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
