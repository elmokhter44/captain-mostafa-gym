'use strict';

require('react-native-get-random-values');
const CryptoJS = require('crypto-js');

const DEFAULT_USERNAME = 'Admin';
const DEFAULT_PASSWORD = 'Admin';
const ITERATIONS = 160000;
const KEY_LENGTH_WORDS = 8; // 32 bytes

function createMobileAuthService(db) {
  function read() { return db.settings(); }
  function derive(password, saltHex) {
    return CryptoJS.PBKDF2(String(password), CryptoJS.enc.Hex.parse(String(saltHex)), {
      keySize: KEY_LENGTH_WORDS,
      iterations: ITERATIONS,
      hasher: CryptoJS.algo.SHA256
    }).toString(CryptoJS.enc.Hex);
  }
  function randomSalt() {
    if (!global.crypto || typeof global.crypto.getRandomValues !== 'function') {
      throw new Error('Secure random generator is unavailable on this Android device.');
    }
    const bytes = new Uint8Array(24);
    global.crypto.getRandomValues(bytes);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
    return hex;
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
