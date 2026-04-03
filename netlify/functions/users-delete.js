const { requireAuth, respond, handleCors } = require('./_helpers');
const { deleteUser } = require('./_users');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return handleCors();
  if (event.httpMethod !== 'POST') return respond(405, { error: 'Method not allowed' });

  const payload = requireAuth(event);
  if (!payload) return respond(401, { error: 'Yetkisiz.' });

  try {
    const { username } = JSON.parse(event.body || '{}');
    if (!username) return respond(400, { error: 'Kullanıcı adı zorunludur.' });

    if (username === payload.user) {
      return respond(400, { error: 'Kendinizi silemezsiniz.' });
    }

    await deleteUser(username);
    return respond(200, { ok: true });
  } catch (e) {
    console.error('users-delete error:', e);
    return respond(500, { error: 'Silinemedi.' });
  }
};
