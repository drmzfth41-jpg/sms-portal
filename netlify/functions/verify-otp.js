const crypto = require('crypto');
const { createToken, respond, handleCors } = require('./_helpers');

const SECRET = process.env.JWT_SECRET || 'sms-portal-dev-secret';

/**
 * Stateless OTP session doğrulama.
 * login.js'in createOtpSession'ı ile oluşturulan imzalı token'ı çözer.
 */
function verifyOtpSession(sessionId) {
  if (!sessionId || !sessionId.includes('.')) return null;
  const dot  = sessionId.lastIndexOf('.');
  const data = sessionId.slice(0, dot);
  const sig  = sessionId.slice(dot + 1);
  const expected = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleCors();
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' });

  try {
    const { sessionId, otp } = JSON.parse(event.body || '{}');
    if (!sessionId || !otp) return respond(400, { error: 'sessionId ve otp zorunludur.' });

    const session = verifyOtpSession(sessionId);

    if (!session) {
      return respond(401, { error: 'Geçersiz veya süresi dolmuş oturum. Lütfen tekrar giriş yapın.' });
    }

    if (session.otp !== String(otp).trim()) {
      return respond(401, { error: 'Hatalı OTP kodu.' });
    }

    const token = createToken({ user: session.username });
    return respond(200, { token });
  } catch {
    return respond(400, { error: 'Geçersiz istek.' });
  }
};
