const RELEASE='quran-series-v1.0.4-exact-ayah-search';
const owner='elmokhter44',repo='captain-mostafa-gym';
const items=[
['01','أبو عمرو البصري','01-AbuAmr-v1.0.4.apk'],
['02','ابن عامر الشامي','02-IbnAmir-v1.0.4.apk'],
['03','ابن كثير المكي','03-IbnKathir-v1.0.4.apk'],
['04','خلف عن حمزة — وجه السكت','04-Khalaf-Hamza-Sakt-v1.0.4.apk'],
['05','الكسائي','05-AlKisai-v1.0.4.apk'],
['06','خلاد عن حمزة — ترك السكت','06-Khallad-Hamza-NoSakt-v1.0.4.apk'],
['07','أبو جعفر المدني','07-AbuJaafar-v1.0.4.apk'],
['08','يعقوب الحضرمي','08-Yaqub-v1.0.4.apk'],
['09','خلف العاشر','09-Khalaf10-v1.0.4.apk'],
['10','عاصم الكوفي','10-Asim-v1.0.4.apk'],
['11','ورش عن نافع — طريق الأزرق','11-Warsh-Azraq-v1.0.4.apk'],
['12','قالون عن نافع — قصر المنفصل','12-Qalun-Qasr-v1.0.4.apk']
];
const base='https://github.com/'+owner+'/'+repo+'/releases/download/'+RELEASE+'/';
const $=s=>document.querySelector(s);
const app=$('#app');
app.innerHTML=`
<div class="shell">
 <section id="home" class="home">
  <div class="brand"><div id="logo"></div><h1>سلسلة قرآني</h1><p>نسخة اختبار عبر المتصفح — 12 مصحف</p></div>
  <div class="notice">اختبر الكروت قبل تثبيت الـAPK. عند فتح أي كارت سيتم استخراج <b>PDF المصحف نفسه</b> من APK الإصدار v1.0.4 الخاص به، وليس من مصحف آخر.</div>
  <div class="grid" id="grid"></div>
  <div class="small">قد يستغرق فتح أول صفحة وقتًا لأن المتصفح يستخرج ملف PDF من APK الخاص بالمصحف الذي اخترته.</div>
 </section>
 <section id="reader" class="reader">
  <div class="topbar"><button class="back" id="back">← الرجوع للمصاحف</button><div class="title" id="readerTitle"></div><div class="status" id="status"></div></div>
  <div class="viewer" id="viewer"><div class="loading">اختر مصحفًا…</div></div>
 </section>
</div>`;
const grid=$('#grid');
items.forEach(([n,name,file])=>{
 const b=document.createElement('button'); b.className='card';
 b.innerHTML=`<div class="num">المصحف ${n}</div><h2>${name}</h2><span>فتح واجهة المصحف واختبار ملفه الأصلي</span>`;
 b.onclick=()=>openMushaf(n,name,file); grid.appendChild(b);
});
function fail(msg){$('#viewer').innerHTML='<div class="error">'+msg+'</div>'}
async function range(url,start,end){
 const r=await fetch(url,{headers:{Range:`bytes=${start}-${end}`}});
 if(!r.ok) throw new Error('HTTP '+r.status);
 return new Uint8Array(await r.arrayBuffer());
}
function u16(a,o){return a[o]|a[o+1]<<8}
function u32(a,o){return (a[o]|a[o+1]<<8|a[o+2]<<16|a[o+3]<<24)>>>0}
function findSig(a,s){for(let i=a.length-4;i>=0;i--)if(u32(a,i)===s)return i;return -1}
async function extractReadingPdf(url){
 const head=await fetch(url,{method:'HEAD'});
 const size=Number(head.headers.get('content-length'));
 if(!size) throw new Error('تعذر معرفة حجم APK');
 const tailSize=Math.min(size,131072);
 const tail=await range(url,size-tailSize,size-1);
 const e=findSig(tail,0x06054b50);
 if(e<0) throw new Error('لم يتم العثور على ZIP directory');
 const cdSize=u32(tail,e+12), cdOffset=u32(tail,e+16);
 const cd=await range(url,cdOffset,cdOffset+cdSize-1);
 let p=0,entry=null;
 while(p+46<=cd.length){
  if(u32(cd,p)!==0x02014b50) break;
  const method=u16(cd,p+10), comp=u32(cd,p+20), uncomp=u32(cd,p+24), nl=u16(cd,p+28), el=u16(cd,p+30), cl=u16(cd,p+32), off=u32(cd,p+42);
  const name=new TextDecoder().decode(cd.slice(p+46,p+46+nl));
  if(name==='assets/pdf/reading.pdf'){entry={method,comp,uncomp,off};break}
  p+=46+nl+el+cl;
 }
 if(!entry) throw new Error('reading.pdf غير موجود داخل APK');
 const local=await range(url,entry.off,entry.off+30-1);
 const nl=u16(local,26),el=u16(local,28);
 const dataStart=entry.off+30+nl+el;
 const raw=await range(url,dataStart,dataStart+entry.comp-1);
 let pdf;
 if(entry.method===0) pdf=raw;
 else if(entry.method===8){
   const ds=new DecompressionStream('deflate-raw');
   pdf=new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(ds)).arrayBuffer());
 } else throw new Error('طريقة ضغط ZIP غير مدعومة: '+entry.method);
 if(pdf.length!==entry.uncomp) console.warn('PDF size differs',pdf.length,entry.uncomp);
 return new Blob([pdf],{type:'application/pdf'});
}
async function openMushaf(n,name,file){
 $('#home').classList.add('hidden'); $('#reader').classList.add('active');
 $('#readerTitle').textContent='المصحف '+n+' — '+name;
 $('#status').textContent='جاري استخراج PDF…';
 $('#viewer').innerHTML='<div class="loading">جاري تحميل المصحف الصحيح من APK v1.0.4…<br><small>لن يتم استخدام ملفات مصحف آخر.</small></div>';
 try{
  const blob=await extractReadingPdf(base+encodeURIComponent(file));
  const url=URL.createObjectURL(blob);
  $('#viewer').innerHTML=`<iframe title="مصحف ${name}" src="${url}#page=1&zoom=page-width"></iframe>`;
  $('#status').textContent='تم فتح PDF الخاص بهذا المصحف';
 }catch(e){
  console.error(e); $('#status').textContent='فشل الفتح'; fail('تعذر فتح المصحف من المتصفح.<br><br>'+e.message+'<br><br>إذا منع المتصفح Range/CORS، سأحوّل المعاينة إلى استضافة PDF مستقلة.');
 }
}
$('#back').onclick=()=>{ $('#reader').classList.remove('active'); $('#home').classList.remove('hidden'); $('#viewer').innerHTML=''; $('#status').textContent=''; };
