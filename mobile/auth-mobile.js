'use strict';

const { NativeModules } = require('react-native');
const GymCrypto = NativeModules.GymCrypto;

const DEFAULT_USERNAME = 'Admin';
const DEFAULT_PASSWORD = 'Admin';
const ITERATIONS = 160000;
const KEY_LENGTH_BYTES = 32;

function nativeCrypto() {
  if (!GymCrypto || typeof GymCrypto.pbkdf2 !== 'function' || typeof GymCrypto.secureRandomHex !== 'function') {
    throw new Error('تعذر تشغيل وحدة التشفير الآمنة على هذا الهاتف.');
  }
  return GymCrypto;
}

function createMobileAuthService(db) {
  function read() { return db.settings(); }
  function derive(password, saltHex) {
    return String(nativeCrypto().pbkdf2(String(password), String(saltHex), ITERATIONS, KEY_LENGTH_BYTES));
  }
  function randomSalt() {
    return String(nativeCrypto().secureRandomHex(24));
  }
  function equalHex(a,b) {
    const x=String(a||''), y=String(b||'');
    if(x.length!==y.length) return false;
    let diff=0; for(let i=0;i<x.length;i++) diff |= x.charCodeAt(i)^y.charCodeAt(i);
    return diff===0;
  }
  function saveCredentials(username,password) {
    const salt=randomSalt();
    db.saveSettings({authUsername:String(username),authPasswordSalt:salt,authPasswordHash:derive(password,salt)});
  }
  function ensureDefaults() {
    const s=read();
    if(!s.authUsername||!s.authPasswordSalt||!s.authPasswordHash){saveCredentials(DEFAULT_USERNAME,DEFAULT_PASSWORD);return{created:true,username:DEFAULT_USERNAME}}
    return{created:false,username:s.authUsername};
  }
  function info(){ensureDefaults();return{username:read().authUsername}}
  function verify(username,password){ensureDefaults();const s=read();return String(username)===String(s.authUsername)&&equalHex(derive(password,s.authPasswordSalt),s.authPasswordHash)}
  function change({currentPassword,newUsername,newPassword}={}){
    ensureDefaults();const s=read();
    if(!verify(s.authUsername,currentPassword||''))throw new Error('كلمة المرور الحالية غير صحيحة');
    const username=String(newUsername??s.authUsername).trim(), password=String(newPassword||'');
    if(!username)throw new Error('اسم المستخدم لا يمكن أن يكون فارغًا');
    if(password&&password.length<4)throw new Error('كلمة المرور الجديدة يجب ألا تقل عن 4 أحرف');
    if(password)saveCredentials(username,password);else db.saveSettings({authUsername:username});
    return{username};
  }
  function resetToDefaults(){saveCredentials(DEFAULT_USERNAME,DEFAULT_PASSWORD);return{username:DEFAULT_USERNAME}}
  return{ensureDefaults,info,verify,change,resetToDefaults};
}

module.exports={createMobileAuthService,DEFAULT_USERNAME,DEFAULT_PASSWORD};
