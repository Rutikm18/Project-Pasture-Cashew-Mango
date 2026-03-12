import { jsonResponse, textResponse, isAdmin, readJsonBody, getIp, rateLimitKV } from './_util.js';

const ORDERS_KEY = 'pasture_orders';
const RATE_LIMIT = 10; // per minute per IP

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
    const list = (await env.PASTURE_KV.get(ORDERS_KEY, { type: 'json' })) || [];
    return jsonResponse(list, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }

  if (request.method === 'POST') {
    const ip = getIp(request);
    const ok = await rateLimitKV(env.PASTURE_KV, `rl:order:${ip}`, RATE_LIMIT, 60);
    if (!ok) return jsonResponse({ error: 'Too many requests. Try again later.' }, { status: 429 });

    const body = await readJsonBody(request);
    const rawItems = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
    const items = rawItems
      .map((i) => ({
        id: String(i.id || '').slice(0, 30),
        name: String(i.name || '').slice(0, 100),
        weight: String(i.weight || '').slice(0, 20),
        price: Math.min(99999, Number(i.price) || 0),
        qty: Math.min(99, Math.max(1, Number(i.qty) || 1))
      }))
      .filter((i) => i.id || i.name);

    const sanitize = (s, max = 200) => String(s || '').trim().slice(0, max);
    const phone = String(body.phone || '').replace(/\D/g, '').slice(-10);
    if (!phone || phone.length < 10) return jsonResponse({ error: 'Valid phone number required' }, { status: 400 });

    const order = {
      id: sanitize(body.orderId, 50) || 'YH-' + Date.now(),
      items,
      subtotal: Math.min(999999, Number(body.subtotal) || 0),
      discount: Math.min(99999, Number(body.discount) || 0),
      delivery: Math.min(9999, Number(body.delivery) || 0),
      total: Math.min(999999, Number(body.total) || 0),
      customer: {
        firstName: sanitize(body.firstName, 80),
        lastName: sanitize(body.lastName, 80),
        phone: '+91' + phone,
        address: sanitize(body.address, 300),
        city: sanitize(body.city, 80),
        pincode: sanitize(body.pincode, 10),
        state: sanitize(body.state, 80)
      },
      at: new Date().toISOString()
    };

    const list = (await env.PASTURE_KV.get(ORDERS_KEY, { type: 'json' })) || [];
    list.push(order);
    await env.PASTURE_KV.put(ORDERS_KEY, JSON.stringify(list));

    return jsonResponse({ ok: true, orderId: order.id }, { status: 200 });
  }

  return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
}

