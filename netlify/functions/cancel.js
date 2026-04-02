const { requireAuth, respond, handleCors, izbilFetch } = require('./_helpers');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleCors();
  if (!requireAuth(event)) return respond(401, { error: 'Yetkisiz.' });
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' });

  const { id } = JSON.parse(event.body || '{}');
  if (!id) return respond(400, { error: 'id zorunludur.' });

  const raw = await izbilFetch('POST', '/sms/cancel', { id: Number(id) });
  if (raw.err) return respond(200, { err: raw.err });
  return respond(200, { err: null, status: raw.data?.status });
};
