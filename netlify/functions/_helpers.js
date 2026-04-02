const crypto = require('crypto');

const SECRET = process.env.JWT_SECRET || 'sms-portal-dev-secret';

function getApiBase() {
  const protocol = process.env.API_PROTOCOL || 'http';
  const host     = process.env.API_HOST     || 'panel.izbil.com';
  const port     = process.env.API_PORT     || '9587';
  return `${protocol}://${host}:${port}`;
}

function getApiAuth() {
  const user = process.env.API_USER || '';
  const pass = process.env.API_PASS || '';
  return Buffer.from(`${user}:${pass}`).toString('base64');
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ─── Token ────────────────────────────────────────────────────────────────────

function createToken(payload) {
  const data = Buffer.from(JSON.stringify({
    ...payload,
    exp: Date.now() + 3600 * 1000, // 1 saat
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const dot = token.lastIndexOf('.');
  const data = token.slice(0, dot);
  const sig  = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function requireAuth(event) {
  const auth = event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  return verifyToken(token);
}

// ─── HTTP Helpers ─────────────────────────────────────────────────────────────

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
    body: JSON.stringify(body),
  };
}

function handleCors() {
  return { statusCode: 204, headers: CORS_HEADERS, body: '' };
}

// ─── izbil API Proxy ──────────────────────────────────────────────────────────

async function izbilFetch(method, path, body = null) {
  const url  = `${getApiBase()}${path}`;
  const init = {
    method,
    headers: {
      'Authorization': `Basic ${getApiAuth()}`,
      'Content-Type':  'application/json',
      'Accept':        'application/json',
    },
  };
  if (body !== null) init.body = JSON.stringify(body);

  try {
    const res  = await fetch(url, init);
    const text = await res.text();
    try { return JSON.parse(text); }
    catch { return { err: { code: res.status, message: text || `HTTP ${res.status}` } }; }
  } catch (e) {
    return { err: { code: 0, message: e.message } };
  }
}

module.exports = { createToken, requireAuth, respond, handleCors, izbilFetch };
