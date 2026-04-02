const { requireAuth, respond, handleCors, izbilFetch } = require('./_helpers');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleCors();
  if (!requireAuth(event)) return respond(401, { error: 'Yetkisiz.' });

  const raw = await izbilFetch('GET', '/user/credit');
  if (raw.err) return respond(200, { err: raw.err });
  return respond(200, { err: null, credit: raw.data.credit });
};
