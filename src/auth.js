'use strict';

const crypto = require('crypto');

const DEFAULT_USERNAME = 'Admin';
const DEFAULT_PASSWORD = 'Admin';
const ITERATIONS = 160000;
const KEY_LENGTH = 32;
const DIGEST = 'sha256';

function createAuthService(db) {
  function read() { return db.settings(); }
  function derive(password, saltHex) {
    return crypto.pbkdf2Sync(String(password), Buffer.from(saltHex, 'hex'), ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  }
  function newCredentials(username, password) {
    const salt = crypto.randomBytes(24).toString('hex');
    return {
      authUsername: String(username),
      authPasswordSalt: salt,
      authPasswordHash: derive(String(password), salt)
    };
  }
  function saveCredentials(username, password) {
    db.saveSettings(newCredentials(username, password));
  }
  function ensureDefaults() {
    const s = read();
    if (!s.authUsername || !s.authPasswordSalt || !s.authPasswordHash) {
      saveCredentials(DEFAULT_USERNAME, DEFAULT_PASSWORD);
      return { created: true, username: DEFAULT_USERNAME };
    }
    return { created: false, username: s.authUsername };
  }
  function info() {
    ensureDefaults();
    return { username: read().authUsername };
  }
  function verify(username, password) {
    ensureDefaults();
    const s = read();
    if (String(username) !== String(s.authUsername)) return false;
    const candidate = Buffer.from(derive(String(password), s.authPasswordSalt), 'hex');
    const stored = Buffer.from(String(s.authPasswordHash), 'hex');
    return candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored);
  }
  function change({ currentPassword, newUsername, newPassword } = {}) {
    ensureDefaults();
    const s = read();
    if (!verify(s.authUsername, currentPassword || '')) throw new Error('كلمة المرور الحالية غير صحيحة');
    const username = String(newUsername ?? s.authUsername).trim();
    const password = String(newPassword || '');
    if (!username) throw new Error('اسم المستخدم لا يمكن أن يكون فارغًا');
    if (password && password.length < 4) throw new Error('كلمة المرور الجديدة يجب ألا تقل عن 4 أحرف');
    if (password) saveCredentials(username, password);
    else db.saveSettings({ authUsername: username });
    return { username };
  }
  function resetToDefaults() {
    saveCredentials(DEFAULT_USERNAME, DEFAULT_PASSWORD);
    return { username: DEFAULT_USERNAME };
  }

  return { ensureDefaults, info, verify, change, resetToDefaults, DEFAULT_USERNAME, DEFAULT_PASSWORD };
}

module.exports = { createAuthService, DEFAULT_USERNAME, DEFAULT_PASSWORD };
