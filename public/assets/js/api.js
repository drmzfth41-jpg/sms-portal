/* ============================================================
   SMS Portal — api.js  (API client + sender cache)
   ============================================================ */

const API = {
  _headers() {
    return {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + (APP.getToken() || ''),
    };
  },

  async _fetch(method, url, body = null) {
    const opts = { method, headers: this._headers() };
    if (body !== null) opts.body = JSON.stringify(body);
    const res  = await fetch(url, opts);
    if (res.status === 401) { APP.logout(); return; }
    return await res.json();
  },

  get(url)        { return this._fetch('GET',  url); },
  post(url, body) { return this._fetch('POST', url, body); },

  // ─── Endpoints ───────────────────────────────────────────
  login(user, pass) { return this.post('/api/login', { username: user, password: pass }); },
  getCredit()       { return this.get('/api/credit'); },

  // Gönderici listesi — 10 dakika sessionStorage cache
  async getSenders() {
    const KEY = 'sp_senders_cache';
    const TTL = 10 * 60 * 1000;
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) {
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts < TTL) return data;
      }
    } catch {}
    const result = await this.post('/api/senders', {});
    if (!result?.err) {
      try { sessionStorage.setItem(KEY, JSON.stringify({ data: result, ts: Date.now() })); } catch {}
    }
    return result;
  },

  clearSendersCache() {
    try { sessionStorage.removeItem('sp_senders_cache'); } catch {}
  },

  sendSingle(data)        { return this.post('/api/send-single',   data); },
  sendMulti(data)         { return this.post('/api/send-multi',    data); },
  sendDynamic(data)       { return this.post('/api/send-dynamic',  data); },
  sendOtp(data)           { return this.post('/api/send-otp',      data); },
  getPackages(params)     { return this.post('/api/packages',       params); },
  getPackageItems(params) { return this.post('/api/package-items',  params); },
  cancelPackage(id)       { return this.post('/api/cancel',         { id }); },
  getNumberHistory(data)  { return this.post('/api/number-history', data); },
};
