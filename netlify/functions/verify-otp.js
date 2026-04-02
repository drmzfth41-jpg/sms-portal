const { createToken, respond, handleCors } = require('./_helpers');
const { otpSessions } = require('./login');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleCors();
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' });

  try {
    const { sessionId, otp } = JSON.parse(event.body || '{}');
    if (!sessionId || !otp) return respond(400, { error: 'sessionId ve otp zorunludur.' });

    const session = otpSessions.get(sessionId);

    if (!session) return respond(401, { error: 'Geçersiz oturum. Lütfen tekrar giriş yapın.' });
    if (Date.now() > session.expiresAt) {
      otpSessions.delete(sessionId);
      return respond(401, { error: 'OTP süresi doldu. Lütfen tekrar giriş yapın.' });
    }
    if (session.otp !== String(otp).trim()) {
      return respond(401, { error: 'Hatalı OTP kodu.' });
    }

    otpSessions.delete(sessionId);
    const token = createToken({ user: session.username });
    return respond(200, { token });
  } catch {
    return respond(400, { error: 'Geçersiz istek.' });
  }
};
