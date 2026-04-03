/**
 * Netlify Blobs tabanlı kullanıcı yönetimi yardımcısı.
 * Store adı: "sms-portal-users", anahtar: username
 */
const { getStore } = require('@netlify/blobs');
const crypto = require('crypto');

function store() {
  return getStore('sms-portal-users');
}

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function normalizePhone(raw) {
  let n = String(raw || '').replace(/\D/g, '');
  if (n.startsWith('90') && n.length === 12) return n;
  if (n.startsWith('0')  && n.length === 11) return '9' + n;
  if (n.startsWith('5')  && n.length === 10) return '90' + n;
  return n;
}

async function getUser(username) {
  try {
    return await store().get(username, { type: 'json' });
  } catch {
    return null;
  }
}

async function listUsers() {
  try {
    const { blobs } = await store().list();
    const users = await Promise.all(blobs.map(b => store().get(b.key, { type: 'json' })));
    return users.filter(Boolean).map(u => ({
      username: u.username,
      phone:    u.phone,
      role:     u.role || 'user',
    }));
  } catch {
    return [];
  }
}

async function saveUser(data) {
  await store().setJSON(data.username, data);
}

async function deleteUser(username) {
  await store().delete(username);
}

/**
 * İlk çalıştırmada Blobs boşsa env var'lardan admin kullanıcısı oluşturur.
 */
async function ensureAdminExists() {
  try {
    const { blobs } = await store().list();
    if (blobs.length > 0) return;

    const username = process.env.APP_USER  || 'admin';
    const password = process.env.APP_PASS  || '';
    const phone    = normalizePhone(process.env.OTP_PHONE || '');
    const salt     = generateSalt();

    await store().setJSON(username, {
      username,
      passwordHash: hashPassword(password, salt),
      salt,
      phone,
      role: 'admin',
    });

    console.log(`[_users] İlk admin oluşturuldu: ${username}`);
  } catch (e) {
    console.error('[_users] ensureAdminExists hata:', e.message);
  }
}

module.exports = {
  getUser, listUsers, saveUser, deleteUser,
  ensureAdminExists, hashPassword, generateSalt, normalizePhone,
};
