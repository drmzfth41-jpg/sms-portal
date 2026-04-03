const { requireAuth, respond, handleCors } = require('./_helpers');
const { listUsers } = require('./_users');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleCors();
  if (event.httpMethod !== 'GET') return respond(405, { error: 'Method not allowed' });

  const payload = requireAuth(event);
  if (!payload) return respond(401, { error: 'Yetkisiz.' });

  try {
    const list = await listUsers();
    return respond(200, { list });
  } catch (e) {
    console.error('users-list error:', e);
    return respond(500, { error: 'Kullanıcılar yüklenemedi.' });
  }
};
