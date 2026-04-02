const { createToken, respond, handleCors } = require('./_helpers');

// Module-level rate limiter (best-effort, per function instance)
const attempts = new Map();
const MAX_ATTEMPTS = 5;
const BLOCK_MS     = 15 * 60 * 1000; // 15 dakika

function getIp(event) {
  return (event.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
}

function isBlocked(ip) {
  const e = attempts.get(ip);
  if (!e) return false;
  if (Date.now() > e.resetAt) { attempts.delete(ip); return false; }
  return e.count >= MAX_ATTEMPTS;
}

function recordFail(ip) {
  const now = Date.now();
  const e   = attempts.get(ip) || { count: 0, resetAt: now + BLOCK_MS };
  if (now > e.resetAt) { e.count = 0; e.resetAt = now + BLOCK_MS; }
  e.count++;
  attempts.set(ip, e);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleCors();
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' });

  const ip = getIp(event);

  if (isBlocked(ip)) {
    return respond(429, { error: 'Çok fazla hatalı giriş denemesi. 15 dakika bekleyin.' });
  }

  try {
    const { username, password } = JSON.parse(event.body || '{}');
    const APP_USER = process.env.APP_USER || 'admin';
    const APP_PASS = process.env.APP_PASS || '';

    if (username === APP_USER && password === APP_PASS) {
      attempts.delete(ip);
      const token = createToken({ user: username });
      return respond(200, { token });
    }

    recordFail(ip);
    const e    = attempts.get(ip);
    const left = e ? Math.max(0, MAX_ATTEMPTS - e.count) : MAX_ATTEMPTS;
    return respond(401, {
      error: `Kullanıcı adı veya şifre hatalı. ${left > 0 ? `${left} deneme hakkınız kaldı.` : 'Hesap kilitlendi.'}`,
    });
  } catch {
    return respond(400, { error: 'Geçersiz istek.' });
  }
};
