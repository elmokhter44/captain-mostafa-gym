'use strict';

const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const target=path.resolve(process.argv[2]||path.join(root,'CaptainMostafaGymMobile'));
const shared=path.join(target,'shared');
const assets=path.join(target,'android','app','src','main','assets','gym');
fs.mkdirSync(shared,{recursive:true});fs.mkdirSync(assets,{recursive:true});

for(const f of ['schema-current.js','schema-legacy-v100.js','logic.js'])fs.copyFileSync(path.join(root,'src',f),path.join(shared,f));

let db=fs.readFileSync(path.join(root,'src','db-pro.js'),'utf8');
db=db.replace("const crypto = require('crypto');","const crypto={randomUUID:()=>`m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`};");
db=db.replace(/module\.exports=\{([^}]+)\};\s*$/m,(m,inside)=>`function close(){try{if(realm&&!realm.isClosed)realm.close()}catch{}realm=null;}\nfunction writeBackupCopy(dest){if(!realm)throw new Error('قاعدة البيانات غير مفتوحة');realm.writeCopyTo({path:dest});return dest;}\nmodule.exports={${inside},close,writeBackupCopy};`);
fs.writeFileSync(path.join(shared,'db-mobile.js'),db,'utf8');

let excel=fs.readFileSync(path.join(root,'src','excel-export.js'),'utf8');
excel=excel.replace("const fs = require('fs');","const {Buffer}=require('buffer');");
excel=excel.replace(/function exportTraineesExcel\([\s\S]*?\n\}\n\nmodule\.exports=/m,"function exportTraineesExcel(){throw new Error('Use createXlsxBuffer on mobile');}\n\nmodule.exports=");
fs.writeFileSync(path.join(shared,'excel-mobile.js'),excel,'utf8');

let html=fs.readFileSync(path.join(root,'src','index.html'),'utf8');
html=html.replace(/<meta name="viewport" content="[^"]*">/i,'<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">');
if(!/href="responsive\.css"/i.test(html)){
  html=html.replace('<link rel="stylesheet" href="styles.css">','<link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="responsive.css" data-responsive-styles="true">');
}
if(!html.includes('bridge.js')){
  if(html.includes('<script src="renderer.js"></script>'))html=html.replace('<script src="renderer.js"></script>','<script src="bridge.js"></script><script src="mobile-preload.js"></script><script src="renderer.js"></script>');
  else html=html.replace('</body>','<script src="bridge.js"></script><script src="mobile-preload.js"></script><script src="renderer.js"></script></body>');
}
fs.writeFileSync(path.join(assets,'index.html'),html,'utf8');
for(const f of ['styles.css','responsive.css','renderer.js'])fs.copyFileSync(path.join(root,'src',f),path.join(assets,f));
fs.copyFileSync(path.join(root,'mobile','bridge.js'),path.join(assets,'bridge.js'));
fs.copyFileSync(path.join(root,'mobile','mobile-preload.js'),path.join(assets,'mobile-preload.js'));

let app=fs.readFileSync(path.join(root,'mobile','App.js'),'utf8');
app=app.replace('<TextInput value={username}','<TextInput testID="loginUsername" accessibilityLabel="loginUsername" value={username}');
app=app.replace('<TextInput value={password}','<TextInput testID="loginPassword" accessibilityLabel="loginPassword" value={password}');
app=app.replace('<TouchableOpacity style={styles.loginButton} onPress={doLogin}','<TouchableOpacity testID="loginButton" accessibilityLabel="loginButton" style={styles.loginButton} onPress={doLogin}');
app=app.replace('<WebView key={webKey}','<WebView testID="mainWebView" accessibilityLabel="mainWebView" key={webKey}');
app=app.replace('javaScriptEnabled domStorageEnabled allowFileAccess','javaScriptEnabled domStorageEnabled textZoom={100} allowFileAccess');
fs.writeFileSync(path.join(target,'App.js'),app,'utf8');
fs.copyFileSync(path.join(root,'mobile','auth-mobile.js'),path.join(target,'auth-mobile.js'));
fs.copyFileSync(path.join(root,'mobile','restore-mobile.js'),path.join(target,'restore-mobile.js'));

const javaDir=path.join(target,'android','app','src','main','java','com','captainmostafagymmobile');
fs.mkdirSync(javaDir,{recursive:true});
fs.copyFileSync(path.join(root,'mobile','GymCryptoModule.kt'),path.join(javaDir,'GymCryptoModule.kt'));
fs.copyFileSync(path.join(root,'mobile','GymCryptoPackage.kt'),path.join(javaDir,'GymCryptoPackage.kt'));
const mainApp=path.join(javaDir,'MainApplication.kt');
if(fs.existsSync(mainApp)){
  let s=fs.readFileSync(mainApp,'utf8');
  if(!s.includes('GymCryptoPackage()')){
    s=s.replace(/PackageList\(this\)\.packages\.apply\s*\{/,m=>`${m}\n          add(GymCryptoPackage())`);
  }
  fs.writeFileSync(mainApp,s,'utf8');
}

const strings=path.join(target,'android','app','src','main','res','values','strings.xml');
if(fs.existsSync(strings)){let s=fs.readFileSync(strings,'utf8');s=s.replace(/<string name="app_name">[\s\S]*?<\/string>/,'<string name="app_name">كابتن مصطفى الريدي</string>');fs.writeFileSync(strings,s,'utf8')}

const appGradle=path.join(target,'android','app','build.gradle');
if(fs.existsSync(appGradle)){
  let s=fs.readFileSync(appGradle,'utf8');
  s=s.replace(/versionCode\s+\d+/,'versionCode 4');
  s=s.replace(/versionName\s+"[^"]+"/,'versionName "1.0.3"');
  fs.writeFileSync(appGradle,s,'utf8');
}

const gp=path.join(target,'android','gradle.properties');if(fs.existsSync(gp)){let s=fs.readFileSync(gp,'utf8');if(/newArchEnabled=.*/.test(s))s=s.replace(/newArchEnabled=.*/,'newArchEnabled=true');else s+='\nnewArchEnabled=true\n';fs.writeFileSync(gp,s,'utf8')}
console.log('Mobile project prepared:',target);
