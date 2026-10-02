const items=[
['01','أبو عمرو البصري','abuamr'],['02','ابن عامر الشامي','ibnamir'],['03','ابن كثير المكي','ibnkathir'],['04','خلف عن حمزة — وجه السكت','khalafhamza'],['05','الكسائي','alkisai'],['06','خلاد عن حمزة — ترك السكت','khalladhamza'],['07','أبو جعفر المدني','abujaafar'],['08','يعقوب الحضرمي','yaqub'],['09','خلف العاشر','khalaf10'],['10','عاصم الكوفي','asim'],['11','ورش عن نافع — طريق الأزرق','warshazraq'],['12','قالون عن نافع — قصر المنفصل','qalunqasr']
];
const base='./pdfs/';
const $=s=>document.querySelector(s);
const app=$('#app');
app.innerHTML=`<div class="shell"><section id="home"><div class="brand"><h1>سلسلة قرآني</h1><p>نسخة اختبار عبر المتصفح — 12 مصحف</p></div><div class="notice">كل كارت مرتبط مباشرة بملف PDF الخاص بالمصحف نفسه.</div><div class="grid" id="grid"></div><div class="small">اضغط أي كارت لاختبار المصحف الصحيح.</div></section><section id="reader" class="reader"><div class="topbar"><button class="back" id="back">← الرجوع للمصاحف</button><div class="title" id="readerTitle"></div><div class="status" id="status"></div></div><div class="viewer" id="viewer"></div></section></div>`;
const grid=$('#grid');
items.forEach(([n,name,slug])=>{const b=document.createElement('button');b.className='card';b.innerHTML=`<div class="num">المصحف ${n}</div><h2>${name}</h2><span>فتح واختبار المصحف الصحيح</span>`;b.onclick=()=>openMushaf(n,name,slug);grid.appendChild(b)});
async function openMushaf(n,name,slug){
 $('#home').classList.add('hidden');$('#reader').classList.add('active');$('#readerTitle').textContent='المصحف '+n+' — '+name;$('#status').textContent='جاري الفتح…';$('#viewer').innerHTML='<div class="loading">جاري فتح ملف المصحف الصحيح…</div>';
 try{const response=await fetch(base+slug+'.pdf',{cache:'no-store'});if(!response.ok)throw Error('PDF HTTP '+response.status);const blob=await response.blob();const url=URL.createObjectURL(blob);$('#viewer').innerHTML=`<iframe title="مصحف ${name}" src="${url}#page=1&zoom=page-width"></iframe>`;$('#status').textContent='تم فتح ملف المصحف الصحيح';}
 catch(e){console.error(e);$('#status').textContent='فشل';$('#viewer').innerHTML='<div class="error">تعذر فتح المصحف.<br><br>'+e.message+'<br><br>تأكد من تحديث الصفحة.</div>';}
}
$('#back').onclick=()=>{$('#reader').classList.remove('active');$('#home').classList.remove('hidden');$('#viewer').innerHTML='';$('#status').textContent=''};
