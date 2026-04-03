const { requireAuth, respond, handleCors } = require('./_helpers');
const { getUser, saveUser, hashPassword, generateSalt, normalizePhone } = require('./_users');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleCors();
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' });

  const payload = requireAuth(event);
  if (!payload) return respond(401, { error: 'Yetkisiz.' });

  try {
    const { username, password, phone, role } = JSON.parse(event.body || '{}');

    if (!username || !username.trim()) return respond(400, { error: 'Kullanıcı adı zorunludur.' });
    if (!phone)                         return respond(400, { error: 'Telefon numarası zorunludur.' });

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone.startsWith('90') || normalizedPhone.length !== 12) {
      return respond(400, { error: 'Geçersiz telefon numarası. Örnek: 05345185718' });
    }

    const existing = await getUser(username.trim());

    let passwordHash, salt;
    if (existing) {
      // Güncelleme: şifre girilmediyse eskisini koru
      salt         = existing.salt;
      passwordHash = password ? hashPassword(password, salt) : existing.passwordHash;
    } else {
      if (!password) return respond(400, { error: 'Yeni kullanıcı için şifre zorunludur.' });
      salt         = generateSalt();
      passwordHash = hashPassword(password, salt);
    }

    await saveUser({
      username: username.trim(),
      passwordHash,
      salt,
      phone: normalizedPhone,
      role:  role === 'admin' ? 'admin' : 'user',
    });

    return respond(200, { ok: true });
  } catch (e) {
    console.error('users-save error:', e);
    return respond(500, { error: 'Kaydedilemedi.' });
  }
};
