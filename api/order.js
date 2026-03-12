/**
 * Order API: POST to save an order, GET to list orders.
 * Security: validation, rate limit, headers.
 */

let orders = [];
const rateLimit = new Map();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 1000;

const ADMIN_SECRET = process.env.ADMIN_SECRET || '';

function allowCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
}

function requireAdmin(req) {
  if (!ADMIN_SECRET) return true; // No secret set = allow (set ADMIN_SECRET to enable protection)
  const key = req.headers['x-admin-key'] || '';
  return key === ADMIN_SECRET;
}

function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
}

function getBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  return {};
}

function getIp(req) {
  return (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown').split(',')[0].trim();
}

function checkRateLimit(ip) {
  const now = Date.now();
  let r = rateLimit.get(ip);
  if (!r || now > r.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (r.count >= RATE_LIMIT) return false;
  r.count++;
  return true;
}

module.exports = async (req, res) => {
  allowCors(res);
  securityHeaders(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    if (!requireAdmin(req)) {
      return res.status(401).json({ error: 'Admin access required. Set ADMIN_SECRET and use X-Admin-Key header.' });
    }
    try {
      // Optional: load from Vercel KV here
      // const { kv } = require('@vercel/kv');
      // const orders = await kv.get('orders') || [];
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json(orders);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
    return;
  }

  if (req.method === 'POST') {
    const ip = getIp(req);
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }
    try {
      const body = getBody(req);
      const rawItems = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
      const items = rawItems.map(i => ({
        id: String(i.id || '').slice(0, 30),
        name: String(i.name || '').slice(0, 100),
        weight: String(i.weight || '').slice(0, 20),
        price: Math.min(99999, Number(i.price) || 0),
        qty: Math.min(99, Math.max(1, Number(i.qty) || 1))
      })).filter(i => i.id || i.name);
      const sanitize = (s, max = 200) => String(s || '').trim().slice(0, max);
      const phone = String(body.phone || '').replace(/\D/g, '').slice(-10);
      if (!phone || phone.length < 10) {
        return res.status(400).json({ error: 'Valid phone number required' });
      }

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
      orders.push(order);

      // Optional: persist to Vercel KV
      // const { kv } = require('@vercel/kv');
      // const list = await kv.get('orders') || []; list.push(order); await kv.set('orders', list);

      console.log('Order received:', orderId || order.id, phone, total);
      res.status(200).json({ ok: true, orderId: order.id });
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: 'Invalid order payload' });
    }
    return;
  }

  res.setHeader('Allow', 'GET, POST, OPTIONS');
  res.status(405).json({ error: 'Method not allowed' });
};
