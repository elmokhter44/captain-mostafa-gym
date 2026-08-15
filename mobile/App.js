import React,{useEffect,useMemo,useRef,useState}from'react';
import{ActivityIndicator,Alert,BackHandler,KeyboardAvoidingView,Linking,Platform,SafeAreaView,StatusBar,StyleSheet,Text,TextInput,TouchableOpacity,View}from'react-native';
import{WebView}from'react-native-webview';
import RNFS from'react-native-fs';
import{pick,keepLocalCopy,saveDocuments}from'@react-native-documents/picker';
import{Buffer}from'buffer';
global.Buffer=Buffer;

const db=require('./shared/db-mobile');
const{createMobileAuthService}=require('./auth-mobile');
const{createXlsxBuffer}=require('./shared/excel-mobile');
const{restoreRealmBackup}=require('./restore-mobile');

const DB_PATH=`${RNFS.DocumentDirectoryPath}/captain-mostafa-gym.realm`;
const AUTH_KEYS=new Set(['authUsername','authPasswordSalt','authPasswordHash']);
const ok=data=>({ok:true,data}),fail=e=>({ok:false,error:e?.message||String(e)||'حدث خطأ غير متوقع'});
const fileUri=p=>p.startsWith('file://')?p:`file://${p}`;

function confirm(title,message){return new Promise(resolve=>Alert.alert(title,message,[{text:'إلغاء',style:'cancel',onPress:()=>resolve(false)},{text:'موافق',style:'destructive',onPress:()=>resolve(true)}],{cancelable:true,onDismiss:()=>resolve(false)}))}
function publicSettings(){const s=db.settings(),out={};Object.entries(s).forEach(([k,v])=>{if(!AUTH_KEYS.has(k))out[k]=v});return out}
function savePublicSettings(input){const clean={};Object.entries(input||{}).forEach(([k,v])=>{if(!AUTH_KEYS.has(k))clean[k]=v});db.saveSettings(clean);return publicSettings()}

const BRIDGE_JS=`(function(){
 if(window.__MOBILE_GYM_BRIDGE__)return;window.__MOBILE_GYM_BRIDGE__=true;
 let seq=0;const pending={};
 window.__nativeGymResolve=function(id,payload){const p=pending[id];if(!p)return;delete pending[id];p.resolve(payload)};
 function call(method,args){return new Promise((resolve,reject)=>{const id='m'+(++seq)+'_'+Date.now();pending[id]={resolve,reject};window.ReactNativeWebView.postMessage(JSON.stringify({id,method,args:args||[]}));setTimeout(()=>{if(pending[id]){delete pending[id];resolve({ok:false,error:'انتهت مهلة الاتصال بالتطبيق'})}},30000)})}
 window.gymAPI={
  bootstrap:()=>call('bootstrap'),dashboard:()=>call('dashboard'),list:f=>call('list',[f]),get:id=>call('get',[id]),add:d=>call('add',[d]),update:(id,d)=>call('update',[id,d]),updateSubscription:(id,d)=>call('updateSubscription',[id,d]),archive:(id,v)=>call('archive',[id,v]),delete:id=>call('delete',[id]),payment:(t,s,a,m,n)=>call('payment',[t,s,a,m,n]),renew:(id,d)=>call('renew',[id,d]),plans:(all=false)=>call('plans',[all]),createPlan:d=>call('createPlan',[d]),updatePlan:(id,d)=>call('updatePlan',[id,d]),setPlanActive:(id,v)=>call('setPlanActive',[id,v]),settings:()=>call('settings'),saveSettings:d=>call('saveSettings',[d]),reminders:()=>call('reminders'),markReminder:(id,s,e)=>call('markReminder',[id,s,e]),whatsapp:(p,m,r)=>call('whatsapp',[p,m,r]),backup:()=>call('backup'),restoreBackup:()=>call('restoreBackup'),exportCsv:()=>call('exportExcel'),openDataFolder:()=>call('openDataFolder'),authInfo:()=>call('authInfo'),changeCredentials:d=>call('changeCredentials',[d])
 };
})();true;`;

export default function App(){
 const webRef=useRef(null);const authRef=useRef(null);
 const[ready,setReady]=useState(false),[loggedIn,setLoggedIn]=useState(false),[username,setUsername]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[webKey,setWebKey]=useState(1);
 useEffect(()=>{try{db.open(DB_PATH);authRef.current=createMobileAuthService(db);authRef.current.ensureDefaults();setReady(true)}catch(e){setError(e?.message||String(e));setReady(true)}return()=>{try{db.close()}catch{}}},[]);
 useEffect(()=>{const sub=BackHandler.addEventListener('hardwareBackPress',()=>{if(loggedIn){Alert.alert('إغلاق البرنامج','هل تريد إغلاق البرنامج؟',[{text:'إلغاء',style:'cancel'},{text:'إغلاق',onPress:()=>BackHandler.exitApp()}]);return true}return false});return()=>sub.remove()},[loggedIn]);

 async function doLogin(){setError('');if(!username.trim()||!password){setError('أدخل اسم المستخدم وكلمة المرور');return}setBusy(true);try{if(!authRef.current.verify(username.trim(),password))setError('اسم المستخدم أو كلمة المرور غير صحيحة');else{setLoggedIn(true);setPassword('')}}catch(e){setError(e?.message||String(e))}finally{setBusy(false)}}
 function forgot(){Alert.alert('نسيت بيانات الدخول؟','سيتم إعادة بيانات تسجيل الدخول إلى القيم الافتراضية بدون حذف بيانات المتدربين أو الاشتراكات.',[{text:'إلغاء',style:'cancel'},{text:'إعادة الضبط',style:'destructive',onPress:()=>{try{authRef.current.resetToDefaults();setUsername('');setPassword('');Alert.alert('تم','تمت إعادة بيانات تسجيل الدخول.')}catch(e){Alert.alert('خطأ',e?.message||String(e))}}}])}

 const dispatch=useMemo(()=>async(method,args=[])=>{
  try{switch(method){
   case'bootstrap':return ok({dashboard:db.dashboard(),trainees:db.listTrainees(),plans:db.plans(),allPlans:db.plans(true),settings:publicSettings(),reminders:db.dueReminders()});
   case'dashboard':return ok(db.dashboard());case'list':return ok(db.listTrainees(args[0]));case'get':return ok(db.getTrainee(args[0]));case'add':return ok(db.addTrainee(args[0]));case'update':return ok(db.updateTrainee(args[0],args[1]));case'updateSubscription':return ok(db.updateCurrentSubscription(args[0],args[1]));case'archive':return ok(db.archiveTrainee(args[0],args[1]));case'delete':return ok(db.deleteTrainee(args[0]));case'payment':return ok(db.addPayment(...args));case'renew':return ok(db.renew(args[0],args[1]));case'plans':return ok(db.plans(args[0]));case'createPlan':return ok(db.createPlan(args[0]));case'updatePlan':return ok(db.updatePlan(args[0],args[1]));case'setPlanActive':return ok(db.setPlanActive(args[0],args[1]));case'settings':return ok(publicSettings());case'saveSettings':return ok(savePublicSettings(args[0]));case'reminders':return ok(db.dueReminders());case'markReminder':return ok(db.markReminder(...args));
   case'whatsapp':{const digits=String(args[0]||'').replace(/[^\d]/g,'');if(!digits)throw new Error('رقم واتساب غير صحيح');await Linking.openURL(`https://wa.me/${digits}?text=${encodeURIComponent(args[1]||'')}`);if(args[2])db.markReminder(args[2],'sent');return ok(true)}
   case'backup':{const tmp=`${RNFS.CachesDirectoryPath}/gym-backup-${new Date().toISOString().slice(0,10)}.realm`;try{if(await RNFS.exists(tmp))await RNFS.unlink(tmp)}catch{}db.writeBackupCopy(tmp);const saved=await saveDocuments({sourceUris:[fileUri(tmp)],fileName:`gym-backup-${new Date().toISOString().slice(0,10)}.realm`,mimeType:'application/octet-stream'});return ok(saved?.[0]?.uri||true)}
   case'exportExcel':{const tmp=`${RNFS.CachesDirectoryPath}/trainees-${new Date().toISOString().slice(0,10)}.xlsx`;const buf=createXlsxBuffer(db.exportRows(),db.settings());await RNFS.writeFile(tmp,buf.toString('base64'),'base64');const saved=await saveDocuments({sourceUris:[fileUri(tmp)],fileName:`trainees-${new Date().toISOString().slice(0,10)}.xlsx`,mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});return ok(saved?.[0]?.uri||true)}
   case'restoreBackup':{const picked=await pick({allowMultiSelection:false});const f=picked?.[0];if(!f)return ok(false);const yes=await confirm('استعادة نسخة احتياطية','سيتم التحقق من الملف وإنشاء نسخة أمان من بيانات الهاتف الحالية ثم استعادة البيانات المختارة.');if(!yes)return ok(false);const copies=await keepLocalCopy({files:[{uri:f.uri,fileName:f.name||'backup.realm'}],destination:'documentDirectory'});const c=copies?.[0];if(!c||c.status!=='success')throw new Error(c?.copyError||'تعذر قراءة ملف النسخة الاحتياطية');await restoreRealmBackup({sourcePath:c.localUri,currentPath:DB_PATH,closeCurrent:()=>db.close(),reopenCurrent:()=>db.open(DB_PATH)});authRef.current=createMobileAuthService(db);authRef.current.ensureDefaults();setTimeout(()=>{setLoggedIn(false);setUsername('');setPassword('');setWebKey(x=>x+1);Alert.alert('تمت الاستعادة','تمت استعادة البيانات. سجل الدخول باستخدام بيانات النسخة الاحتياطية.')},250);return ok(true)}
   case'openDataFolder':Alert.alert('بيانات التطبيق','قاعدة البيانات محفوظة محليًا داخل مساحة التطبيق الآمنة على الهاتف. استخدم «نسخة احتياطية» لحفظها في الملفات أو نقلها لجهاز آخر.');return ok(true);
   case'authInfo':return ok(authRef.current.info());case'changeCredentials':return ok(authRef.current.change(args[0]));default:throw new Error(`عملية غير مدعومة: ${method}`)
  }}catch(e){return fail(e)}
 },[]);

 async function onMessage(event){let req;try{req=JSON.parse(event.nativeEvent.data)}catch{return}const result=await dispatch(req.method,req.args||[]);const js=`window.__nativeGymResolve(${JSON.stringify(req.id)},${JSON.stringify(result)});true;`;try{webRef.current?.injectJavaScript(js)}catch{}}

 if(!ready)return <View style={styles.center}><ActivityIndicator size="large" color="#147f91"/><Text style={styles.loading}>جاري تجهيز قاعدة البيانات...</Text></View>;
 if(error&&!authRef.current)return <View style={styles.center}><Text style={styles.errorTitle}>تعذر فتح البرنامج</Text><Text style={styles.errorText}>{error}</Text></View>;
 if(!loggedIn)return <SafeAreaView style={styles.loginRoot}><StatusBar barStyle="dark-content" backgroundColor="#f3f7f6"/><KeyboardAvoidingView style={styles.loginOuter} behavior={Platform.OS==='ios'?'padding':undefined}><View style={styles.loginCard}><View style={styles.logo}><Text style={styles.logoText}>M</Text></View><Text style={styles.loginTitle}>كابتن مصطفى الريدي</Text><Text style={styles.loginSub}>تسجيل الدخول إلى نظام إدارة الجيم</Text><Text style={styles.label}>اسم المستخدم</Text><TextInput value={username} onChangeText={setUsername} style={styles.input} autoCapitalize="none" textAlign="right" placeholder="اسم المستخدم" placeholderTextColor="#9aa7aa"/><Text style={styles.label}>كلمة المرور</Text><TextInput value={password} onChangeText={setPassword} style={styles.input} secureTextEntry textAlign="right" placeholder="كلمة المرور" placeholderTextColor="#9aa7aa" onSubmitEditing={doLogin}/>{!!error&&<Text style={styles.loginError}>{error}</Text>}<TouchableOpacity style={styles.loginButton} onPress={doLogin} disabled={busy}>{busy?<ActivityIndicator color="#fff"/>:<Text style={styles.loginButtonText}>تسجيل الدخول</Text>}</TouchableOpacity><TouchableOpacity onPress={forgot}><Text style={styles.forgot}>نسيت بيانات الدخول؟</Text></TouchableOpacity></View></KeyboardAvoidingView></SafeAreaView>;
 return <SafeAreaView style={styles.appRoot}><StatusBar barStyle="dark-content" backgroundColor="#f3f7f6"/><WebView key={webKey} ref={webRef} source={{uri:'file:///android_asset/gym/index.html'}} originWhitelist={['*']} javaScriptEnabled domStorageEnabled allowFileAccess allowFileAccessFromFileURLs allowUniversalAccessFromFileURLs injectedJavaScriptBeforeContentLoaded={BRIDGE_JS} onMessage={onMessage} setSupportMultipleWindows={false} style={styles.web}/></SafeAreaView>;
}

const styles=StyleSheet.create({appRoot:{flex:1,backgroundColor:'#f3f7f6'},web:{flex:1,backgroundColor:'#f3f7f6'},center:{flex:1,alignItems:'center',justifyContent:'center',padding:24,backgroundColor:'#f3f7f6'},loading:{marginTop:12,color:'#64777c'},errorTitle:{fontSize:20,fontWeight:'800',color:'#a7333e',marginBottom:8},errorText:{textAlign:'center',color:'#5c6b70'},loginRoot:{flex:1,backgroundColor:'#f3f7f6'},loginOuter:{flex:1,alignItems:'center',justifyContent:'center',padding:18},loginCard:{width:'100%',maxWidth:430,backgroundColor:'#fff',borderRadius:28,padding:24,elevation:5,shadowColor:'#183f48',shadowOpacity:.12,shadowRadius:18,shadowOffset:{width:0,height:7}},logo:{width:64,height:64,borderRadius:21,backgroundColor:'#147f91',alignSelf:'center',alignItems:'center',justifyContent:'center',marginBottom:14},logoText:{color:'#fff',fontSize:30,fontWeight:'900'},loginTitle:{fontSize:24,fontWeight:'900',textAlign:'center',color:'#173e4a'},loginSub:{fontSize:13,textAlign:'center',color:'#71858a',marginTop:6,marginBottom:24},label:{fontSize:13,fontWeight:'700',color:'#284e58',textAlign:'right',marginBottom:7,marginTop:10},input:{height:52,borderWidth:1,borderColor:'#dbe7e5',borderRadius:15,paddingHorizontal:14,color:'#173e4a',backgroundColor:'#fbfdfc',fontSize:15},loginError:{textAlign:'center',color:'#c23d48',fontSize:13,marginTop:12},loginButton:{height:54,borderRadius:16,backgroundColor:'#147f91',alignItems:'center',justifyContent:'center',marginTop:20},loginButtonText:{color:'#fff',fontSize:16,fontWeight:'800'},forgot:{textAlign:'center',color:'#2675b9',fontSize:13,fontWeight:'700',marginTop:18}});
