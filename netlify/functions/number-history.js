const { requireAuth, respond, handleCors, izbilFetch } = require('./_helpers');

// Normalize Turkish phone number → 90XXXXXXXXXX
function normalizePhone(raw) {
  let n = String(raw).replace(/\D/g, '');
  if (n.startsWith('90') && n.length === 12) return n;
  if (n.startsWith('0')  && n.length === 11) return '9' + n;
  if (n.startsWith('5')  && n.length === 10) return '90' + n;
  return n;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleCors();
  if (!requireAuth(event)) return respond(401, { error: 'Yetkisiz.' });

  const { number, startDate, finishDate, pageSize = 100 } = JSON.parse(event.body || '{}');
  if (!number) return respond(400, { error: 'number zorunludur.' });

  const target = normalizePhone(number);

  // 1. Son paketleri al (max 200)
  const pkgRes = await izbilFetch('POST', '/sms/list', {
    ids: null, status: null, keyword: null, sender: null,
    startDate:  startDate  ?? null,
    finishDate: finishDate ?? null,
    pageIndex: 0, pageSize: 200,
  });

  if (pkgRes.err) return respond(200, { err: pkgRes.err });

  const packages = pkgRes.data?.list ?? [];
  if (!packages.length) return respond(200, { err: null, list: [], total: 0 });

  // 2. Her paketi paralel sorgula, target numarayı filtrele
  const results = await Promise.all(
    packages.map(pkg =>
      izbilFetch('POST', '/sms/list-item', {
        pkgID: pkg.id,
        target,
        uuid: null, operator: null, state: null,
        startDate: null, finishDate: null,
        pageIndex: 0, pageSize: 50,
      }).then(r => {
        const items = r.data?.list ?? [];
        return items.map(item => ({
          ...item,
          pkgID:      pkg.id,
          pkgTitle:   pkg.title,
          sender:     pkg.sender,
          createDate: pkg.createDate,
        }));
      }).catch(() => [])
    )
  );

  const flat = results.flat().sort((a, b) =>
    new Date(b.createDate || 0) - new Date(a.createDate || 0)
  );

  return respond(200, { err: null, list: flat.slice(0, pageSize), total: flat.length, target });
};
