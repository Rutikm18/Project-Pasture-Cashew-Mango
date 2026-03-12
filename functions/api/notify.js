import { jsonResponse, textResponse, isAdmin, readJsonBody, getIp, rateLimitKV } from './_util.js';

const WAITLIST_KEY = 'pasture_waitlist';
const RATE_LIMIT = 5; // per minute per IP

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return textResponse('', { status: 204 });

  if (!env.PASTURE_KV) {
    return jsonResponse(
      { error: 'Cloudflare KV is not configured. Bind KV as PASTURE_KV.' },
      { status: 500 }
    );
  }

  if (request.method === 'GET') {
    if (!isAdmin(request, env)) {
      return jsonResponse(
        { error: 'Admin access required. Set ADMIN_SECRET and use X-Admin-Key header.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    const list = (await env.PASTURE_KV.get(WAITLIST_KEY, { type: 'json' })) || [];
    return jsonResponse(list, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  const ip = getIp(request);
  const ok = await rateLimitKV(env.PASTURE_KV, `rl:notify:${ip}`, RATE_LIMIT, 60);
  if (!ok) return jsonResponse({ error: 'Too many requests. Try again later.' }, { status: 429 });

  const body = await readJsonBody(request);
  const rawPhone = String(body.phone || '').trim();
  const phone = rawPhone.replace(/\D/g, '').slice(-10);
  if (!phone || phone.length < 10) return jsonResponse({ error: 'Valid phone number required' }, { status: 400 });

  const entry = { phone: '+91' + phone, at: new Date().toISOString() };
  const list = (await env.PASTURE_KV.get(WAITLIST_KEY, { type: 'json' })) || [];
  list.push(entry);
  await env.PASTURE_KV.put(WAITLIST_KEY, JSON.stringify(list));

  return jsonResponse({ success: true, message: 'You are on the list!' }, { status: 200 });
}

