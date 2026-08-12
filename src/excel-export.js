'use strict';

const fs = require('fs');

const COLUMNS = [
  { key:'name', title:'اسم المتدرب', width:24, type:'text' },
  { key:'country', title:'البلد', width:14, type:'text' },
  { key:'countryCode', title:'كود الدولة', width:12, type:'text' },
  { key:'phone', title:'رقم الموبايل', width:18, type:'text' },
  { key:'normalizedPhone', title:'رقم واتساب', width:20, type:'text' },
  { key:'plan', title:'الخطة', width:32, type:'text' },
  { key:'monthlyPrice', title:'سعر الشهر', width:14, type:'money' },
  { key:'months', title:'عدد الأشهر', width:12, type:'number' },
  { key:'startDate', title:'بداية الاشتراك', width:16, type:'date' },
  { key:'endDate', title:'نهاية الاشتراك', width:16, type:'date' },
  { key:'status', title:'الحالة', width:16, type:'status' },
  { key:'total', title:'الإجمالي', width:14, type:'money' },
  { key:'paid', title:'المدفوع', width:14, type:'money' },
  { key:'remaining', title:'المتبقي', width:14, type:'money' },
  { key:'archived', title:'مؤرشف', width:11, type:'text' },
  { key:'notes', title:'ملاحظات', width:34, type:'text' }
];

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}

function colName(n) {
  let s='';
  while(n>0){n--;s=String.fromCharCode(65+(n%26))+s;n=Math.floor(n/26)}
  return s;
}

function statusArabic(value) {
  return ({active:'نشط',expiring:'ينتهي قريبًا',expired:'منتهي',archived:'مؤرشف'})[String(value||'').toLowerCase()] || String(value||'');
}

function excelDateSerial(value) {
  if(!value) return null;
  const d = new Date(value);
  if(Number.isNaN(d.getTime())) return null;
  const utc = Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate());
  return utc / 86400000 + 25569;
}

function makeCell(ref, value, type, header=false) {
  if(header) return `<c r="${ref}" t="inlineStr" s="1"><is><t>${xmlEscape(value)}</t></is></c>`;
  if(type==='date') {
    const serial=excelDateSerial(value);
    return serial==null ? `<c r="${ref}" t="inlineStr" s="2"><is><t></t></is></c>` : `<c r="${ref}" s="3"><v>${serial}</v></c>`;
  }
  if(type==='money') return `<c r="${ref}" s="4"><v>${Number(value||0)}</v></c>`;
  if(type==='number') return `<c r="${ref}" s="5"><v>${Number(value||0)}</v></c>`;
  const text = type==='status' ? statusArabic(value) : String(value??'');
  return `<c r="${ref}" t="inlineStr" s="2"><is><t xml:space="preserve">${xmlEscape(text)}</t></is></c>`;
}

function sheetXml(rows) {
  const headerCells=COLUMNS.map((c,i)=>makeCell(`${colName(i+1)}1`,c.title,c.type,true)).join('');
  const dataRows=rows.map((row,rIndex)=>{
    const rowNum=rIndex+2;
    const cells=COLUMNS.map((c,i)=>makeCell(`${colName(i+1)}${rowNum}`,row[c.key],c.type,false)).join('');
    return `<row r="${rowNum}" ht="22" customHeight="1">${cells}</row>`;
  }).join('');
  const cols=COLUMNS.map((c,i)=>`<col min="${i+1}" max="${i+1}" width="${c.width}" customWidth="1"/>`).join('');
  const lastRow=Math.max(1,rows.length+1);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0" rightToLeft="1"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="20"/>
  <cols>${cols}</cols>
  <sheetData><row r="1" ht="28" customHeight="1">${headerCells}</row>${dataRows}</sheetData>
  <autoFilter ref="A1:P${lastRow}"/>
  <pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
  <pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;
}

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="#,##0.00"/></numFmts>
  <fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts>
  <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF147F91"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFDDE8E5"/></left><right style="thin"><color rgb="FFDDE8E5"/></right><top style="thin"><color rgb="FFDDE8E5"/></top><bottom style="thin"><color rgb="FFDDE8E5"/></bottom><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="6">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1" readingOrder="2"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function crc32(buffer) {
  let crc=0xffffffff;
  for(const byte of buffer){crc^=byte;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}
  return (crc^0xffffffff)>>>0;
}

function dosDateTime(date=new Date()) {
  const year=Math.max(1980,date.getFullYear());
  const time=(date.getHours()<<11)|(date.getMinutes()<<5)|Math.floor(date.getSeconds()/2);
  const day=((year-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate();
  return {time,day};
}

function zipStore(entries) {
  const locals=[],centrals=[];let offset=0;const dt=dosDateTime();
  for(const entry of entries){
    const name=Buffer.from(entry.name,'utf8'),data=Buffer.isBuffer(entry.data)?entry.data:Buffer.from(entry.data,'utf8'),crc=crc32(data);
    const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(0x0800,6);local.writeUInt16LE(0,8);local.writeUInt16LE(dt.time,10);local.writeUInt16LE(dt.day,12);local.writeUInt32LE(crc,14);local.writeUInt32LE(data.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);local.writeUInt16LE(0,28);
    locals.push(local,name,data);
    const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x0800,8);central.writeUInt16LE(0,10);central.writeUInt16LE(dt.time,12);central.writeUInt16LE(dt.day,14);central.writeUInt32LE(crc,16);central.writeUInt32LE(data.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(name.length,28);central.writeUInt16LE(0,30);central.writeUInt16LE(0,32);central.writeUInt16LE(0,34);central.writeUInt16LE(0,36);central.writeUInt32LE(0,38);central.writeUInt32LE(offset,42);
    centrals.push(central,name);offset+=local.length+name.length+data.length;
  }
  const centralStart=offset,centralBuffer=Buffer.concat(centrals),localBuffer=Buffer.concat(locals);
  const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(0,4);end.writeUInt16LE(0,6);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(centralBuffer.length,12);end.writeUInt32LE(centralStart,16);end.writeUInt16LE(0,20);
  return Buffer.concat([localBuffer,centralBuffer,end]);
}

function createXlsxBuffer(rows=[], settings={}) {
  const now=new Date().toISOString();
  const entries=[
    {name:'[Content_Types].xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`},
    {name:'_rels/.rels',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`},
    {name:'xl/workbook.xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets><sheet name="بيانات المتدربين" sheetId="1" r:id="rId1"/></sheets></workbook>`},
    {name:'xl/_rels/workbook.xml.rels',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},
    {name:'xl/styles.xml',data:stylesXml},
    {name:'xl/worksheets/sheet1.xml',data:sheetXml(rows)},
    {name:'docProps/core.xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>${xmlEscape(settings.gymName||'Captain Mostafa Gym')}</dc:creator><dc:title>بيانات المتدربين</dc:title><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created></cp:coreProperties>`},
    {name:'docProps/app.xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Captain Mostafa Gym</Application></Properties>`}
  ];
  return zipStore(entries);
}

function exportTraineesExcel(filePath, rows, settings) {
  fs.writeFileSync(filePath, createXlsxBuffer(rows,settings));
  return filePath;
}

module.exports={COLUMNS,createXlsxBuffer,exportTraineesExcel,statusArabic};
