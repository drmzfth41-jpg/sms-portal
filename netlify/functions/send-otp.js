const crypto = require('crypto');
const { requireAuth, respond, handleCors, izbilFetch } = require('./_helpers');

// Kriptografik güvenli OTP üret
function generateOtp(length = 6) {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes).map(b => b % 10).join('');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleCors();
  if (!requireAuth(event)) return respond(401, { error: 'Yetkisiz.' });
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' });

  const DEFAULT_SENDER = process.env.API_SENDER || '';
  const {
    number, content,
    sender   = DEFAULT_SENDER,
    encoding = 1,
  } = JSON.parse(event.body || '{}');

  if (!number || !content) return respond(400, { error: 'number ve content zorunludur.' });

  // OTP'yi güvenli şekilde backend'de üret
  const otpCode      = generateOtp(6);
  const finalContent = content.replace(/{OTP}/g, otpCode);

  // /sms/create-otp endpoint'i özel gönderici onayı gerektiriyor,
  // regular /sms/create ile tekil gönderim yapıyoruz
  const raw = await izbilFetch('POST', '/sms/create', {
    type: 1, sendingType: 0,
    title: sender, sender,
    content: finalContent,
    number:  String(number).replace(/\D/g, ''),
    encoding,
    validity:          60,   // OTP için 60 dk geçerlilik
    commercial:        false,
    sendingDate:       null,
    periodicSettings:  null,
    pushSettings:      null,
  });

  if (raw.err) return respond(200, { err: raw.err });
  return respond(200, { err: null, pkgID: raw.data?.pkgID, otpCode });
};
