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
if(!html.includes('bridge.js')){
  if(html.includes('<script src="renderer.js"></script>'))html=html.replace('<script src="renderer.js"></script>','<script src="bridge.js"></script><script src="mobile-preload.js"></script><script src="renderer.js"></script>');
  else html=html.replace('</body>','<script src="bridge.js"></script><script src="mobile-preload.js"></script><script src="renderer.js"></script></body>');
}
fs.writeFileSync(path.join(assets,'index.html'),html,'utf8');
for(const f of ['styles.css','responsive.css','renderer.js'])fs.copyFileSync(path.join(root,'src',f),path.join(assets,f));
fs.copyFileSync(path.join(root,'mobile','bridge.js'),path.join(assets,'bridge.js'));
fs.copyFileSync(path.join(root,'mobile','mobile-preload.js'),path.join(assets,'mobile-preload.js'));

fs.copyFileSync(path.join(root,'mobile','App.js'),path.join(target,'App.js'));
fs.copyFileSync(path.join(root,'mobile','auth-mobile.js'),path.join(target,'auth-mobile.js'));
fs.copyFileSync(path.join(root,'mobile','restore-mobile.js'),path.join(target,'restore-mobile.js'));

const strings=path.join(target,'android','app','src','main','res','values','strings.xml');
if(fs.existsSync(strings)){let s=fs.readFileSync(strings,'utf8');s=s.replace(/<string name="app_name">[\s\S]*?<\/string>/,'<string name="app_name">كابتن مصطفى الريدي</string>');fs.writeFileSync(strings,s,'utf8')}
const gp=path.join(target,'android','gradle.properties');if(fs.existsSync(gp)){let s=fs.readFileSync(gp,'utf8');if(/newArchEnabled=.*/.test(s))s=s.replace(/newArchEnabled=.*/,'newArchEnabled=true');else s+='\nnewArchEnabled=true\n';fs.writeFileSync(gp,s,'utf8')}
console.log('Mobile project prepared:',target);
