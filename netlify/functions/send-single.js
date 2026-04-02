const { requireAuth, respond, handleCors, izbilFetch } = require('./_helpers');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleCors();
  if (!requireAuth(event)) return respond(401, { error: 'Yetkisiz.' });
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' });

  const DEFAULT_SENDER = process.env.API_SENDER || '';
  const {
    number, content, sender = DEFAULT_SENDER, title = DEFAULT_SENDER,
    encoding = 1, validity = 60, commercial = false,
    sendingDate = null, pushUrl = null,
  } = JSON.parse(event.body || '{}');

  if (!number || !content) return respond(400, { error: 'number ve content zorunludur.' });

  const raw = await izbilFetch('POST', '/sms/create', {
    type: 1, sendingType: 0,
    title, sender, content,
    number: String(number).replace(/\D/g, ''),
    encoding, validity, commercial,
    sendingDate,
    periodicSettings: null,
    pushSettings: pushUrl ? { url: pushUrl } : null,
  });
  if (raw.err) return respond(200, { err: raw.err });
  return respond(200, { err: null, pkgID: raw.data?.pkgID });
};
