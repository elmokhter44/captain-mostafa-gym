'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { execFileSync } = require('child_process');

test('Realm backup restore scenarios pass in isolated worker', () => {
  const worker = path.join(__dirname,'backup-restore-worker.js');
  const output = execFileSync(process.execPath,[worker],{encoding:'utf8',timeout:45000});
  assert.match(output,/BACKUP RESTORE TESTS PASSED/);
});
