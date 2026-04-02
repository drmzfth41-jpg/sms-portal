const { requireAuth, respond, handleCors, izbilFetch } = require('./_helpers');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleCors();
  if (!requireAuth(event)) return respond(401, { error: 'Yetkisiz.' });

  const body = JSON.parse(event.body || '{}');
  if (!body.pkgID) return respond(400, { error: 'pkgID zorunludur.' });

  const raw = await izbilFetch('POST', '/sms/list-item', {
    pkgID:      body.pkgID,
    uuid:       body.uuid        ?? null,
    target:     body.target      ?? null,
    operator:   body.operator    ?? null,
    state:      body.state       ?? null,
    startDate:  body.startDate   ?? null,
    finishDate: body.finishDate  ?? null,
    pageIndex:  body.pageIndex   ?? 0,
    pageSize:   body.pageSize    ?? 100,
  });
  if (raw.err) return respond(200, { err: raw.err });
  return respond(200, { err: null, list: raw.data?.list ?? [] });
};
