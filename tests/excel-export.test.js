'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createXlsxBuffer, statusArabic } = require('../src/excel-export');

function storedZipEntries(buffer){
  const entries=new Map();let offset=0;
  while(offset+30<=buffer.length && buffer.readUInt32LE(offset)===0x04034b50){
    const method=buffer.readUInt16LE(offset+8);
    const size=buffer.readUInt32LE(offset+18);
    const nameLen=buffer.readUInt16LE(offset+26);
    const extraLen=buffer.readUInt16LE(offset+28);
    assert.equal(method,0,'XLSX test expects stored ZIP entries');
    const nameStart=offset+30,nameEnd=nameStart+nameLen,dataStart=nameEnd+extraLen,dataEnd=dataStart+size;
    const name=buffer.subarray(nameStart,nameEnd).toString('utf8');
    entries.set(name,buffer.subarray(dataStart,dataEnd));
    offset=dataEnd;
  }
  return entries;
}

test('Excel export is a valid structured XLSX with RTL formatted trainee rows',()=>{
  const buffer=createXlsxBuffer([{
    name:'مصطفى الريدي',country:'مصر',countryCode:'+20',phone:'01012345678',normalizedPhone:'+201012345678',
    plan:'كمال أجسام',monthlyPrice:300,months:1,startDate:'2026-08-12T00:00:00.000Z',endDate:'2026-09-11T00:00:00.000Z',
    status:'active',total:300,paid:200,remaining:100,archived:'لا',notes:'اختبار تصدير Excel'
  }],{gymName:'كابتن مصطفى الريدي'});
  assert.equal(buffer.readUInt32LE(0),0x04034b50);
  assert.equal(buffer.readUInt32LE(buffer.length-22),0x06054b50);
  const entries=storedZipEntries(buffer);
  for(const required of ['[Content_Types].xml','_rels/.rels','xl/workbook.xml','xl/_rels/workbook.xml.rels','xl/styles.xml','xl/worksheets/sheet1.xml']) assert.ok(entries.has(required),`missing ${required}`);
  const sheet=entries.get('xl/worksheets/sheet1.xml').toString('utf8');
  const styles=entries.get('xl/styles.xml').toString('utf8');
  const workbook=entries.get('xl/workbook.xml').toString('utf8');
  assert.match(workbook,/بيانات المتدربين/);
  assert.match(sheet,/rightToLeft="1"/);
  assert.match(sheet,/state="frozen"/);
  assert.match(sheet,/autoFilter ref="A1:P2"/);
  assert.match(sheet,/اسم المتدرب/);
  assert.match(sheet,/مصطفى الريدي/);
  assert.match(sheet,/01012345678/);
  assert.match(sheet,/نشط/);
  assert.match(sheet,/اختبار تصدير Excel/);
  assert.match(styles,/dd\/mm\/yyyy/);
  assert.match(styles,/#,##0\.00/);
});

test('status labels exported to Excel are Arabic',()=>{
  assert.equal(statusArabic('active'),'نشط');
  assert.equal(statusArabic('expiring'),'ينتهي قريبًا');
  assert.equal(statusArabic('expired'),'منتهي');
});
