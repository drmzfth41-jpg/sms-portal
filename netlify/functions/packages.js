const { requireAuth, respond, handleCors, izbilFetch } = require('./_helpers');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleCors();
  if (!requireAuth(event)) return respond(401, { error: 'Yetkisiz.' });

  const body = JSON.parse(event.body || '{}');
  const raw = await izbilFetch('POST', '/sms/list', {
    ids:        body.ids        ?? null,
    status:     body.status     ?? null,
    keyword:    body.keyword    ?? null,
    sender:     body.sender     ?? null,
    startDate:  body.startDate  ?? null,
    finishDate: body.finishDate ?? null,
    pageIndex:  body.pageIndex  ?? 0,
    pageSize:   body.pageSize   ?? 50,
  });
  if (raw.err) return respond(200, { err: raw.err });
  return respond(200, { err: null, list: raw.data?.list ?? [], total: raw.data?.stats?.totalRecord ?? 0 });
};
