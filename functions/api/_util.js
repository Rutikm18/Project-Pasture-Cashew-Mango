function jsonResponse(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  return new Response(JSON.stringify(data), { ...init, headers });
}

function textResponse(text, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  return new Response(text, { ...init, headers });
}

function isAdmin(request, env) {
  const secret = env.ADMIN_SECRET || '';
  if (!secret) return true;
  const key = request.headers.get('X-Admin-Key') || '';
  return key === secret;
}

async function readJsonBody(request) {
  if (!request.body) return {};
  try {
    return await request.json();
  } catch (_) {
    return {};
  }
}

function getIp(request) {
  const cf = request.headers.get('CF-Connecting-IP');
  if (cf) return cf;
  const xff = request.headers.get('X-Forwarded-For');
  if (xff) return xff.split(',')[0].trim();
  return 'unknown';
}

async function rateLimitKV(kv, key, limit, ttlSeconds) {
  // Best-effort rate limiting using KV counter with TTL.
  // KV is eventually consistent; this is a pragmatic protection (not strict).
  const raw = await kv.get(key);
  const n = raw ? parseInt(raw, 10) || 0 : 0;
  if (n >= limit) return false;
  await kv.put(key, String(n + 1), { expirationTtl: ttlSeconds });
  return true;
}

export {
  jsonResponse,
  textResponse,
  isAdmin,
  readJsonBody,
  getIp,
  rateLimitKV
};

