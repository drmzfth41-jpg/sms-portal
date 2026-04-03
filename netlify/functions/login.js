const crypto = require('crypto');
const { createToken, respond, handleCors, izbilFetch } = require('./_helpers');
const { getUser, ensureAdminExists, hashPassword } = require('./_users');

const SECRET       = process.env.JWT_SECRET || 'sms-portal-dev-secret';
const OTP_TTL_MS   = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const BLOCK_MS     = 15 * 60 * 1000;

// Rate limiter (bellek içi — sadece aynı container'da geçerli, yeterli)
const attempts = new Map();

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

function generateOtp() {
  return Array.from(crypto.randomBytes(6)).map(b => b % 10).join('');
}

/**
 * OTP session — stateless imzalı token (serverless-safe).
 * Bellek Map'e gerek yok; verify-otp imzayı doğrulayarak içeriği okur.
 */
function createOtpSession(otp, username) {
  const data = Buffer.from(JSON.stringify({
    otp,
    username,
    expiresAt: Date.now() + OTP_TTL_MS,
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

async function sendOtpSms(otp, phone) {
  const sender = process.env.API_SENDER || '';
  if (!phone) return { err: { message: 'Kullanıcıya telefon numarası tanımlı değil.' } };

  return izbilFetch('POST', '/sms/create', {
    type: 1, sendingType: 0,
    title: sender, sender,
    content: `SMS Portal giris kodunuz: ${otp}. 5 dakika gecerlidir.`,
    number: phone.replace(/\D/g, ''),
    encoding: 1,
    commercial: false,
    sendingDate: null, periodicSettings: null, pushSettings: null,
  });
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

    await ensureAdminExists();
    const userRecord = await getUser(username);

    let authOk = false;
    let otpPhone = '';

    if (userRecord) {
      authOk   = hashPassword(password, userRecord.salt) === userRecord.passwordHash;
      otpPhone = userRecord.phone;
    } else {
      // Blobs henüz yok veya hata — env var'a fallback
      const APP_USER = process.env.APP_USER || 'admin';
      const APP_PASS = process.env.APP_PASS || '';
      authOk   = username === APP_USER && password === APP_PASS;
      otpPhone = process.env.OTP_PHONE || '';
    }

    if (!authOk) {
      recordFail(ip);
      const e    = attempts.get(ip);
      const left = e ? Math.max(0, MAX_ATTEMPTS - e.count) : MAX_ATTEMPTS;
      return respond(401, {
        error: `Kullanıcı adı veya şifre hatalı. ${left > 0 ? `${left} deneme hakkınız kaldı.` : 'Hesap kilitlendi.'}`,
      });
    }

    attempts.delete(ip);
    const otp       = generateOtp();
    const sessionId = createOtpSession(otp, username);

    const smsResult = await sendOtpSms(otp, otpPhone);
    if (smsResult?.err) {
      console.error('OTP SMS gönderilemedi:', smsResult.err);
    }

    return respond(200, { otpRequired: true, sessionId });
  } catch (e) {
    console.error('login error:', e);
    return respond(400, { error: 'Geçersiz istek.' });
  }
};

// createOtpSession'ı verify-otp için export et
module.exports.createOtpSession = createOtpSession;
module.exports.createToken      = createToken;
