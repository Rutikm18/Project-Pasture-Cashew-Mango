/**
 * Order API: POST to save an order, GET to list orders.
 * Orders are logged and returned. For persistent storage (e.g. across serverless
 * cold starts), use Vercel KV: set KV_REST_API_URL and KV_REST_API_TOKEN, and
 * uncomment the @vercel/kv usage below.
 */

// In-memory store (resets on cold start; use Vercel KV for production)
let orders = [];

function allowCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  allowCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
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
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const {
        orderId,
        items = [],
        subtotal,
        discount,
        delivery,
        total,
        firstName,
        lastName,
        phone,
        address,
        city,
        pincode,
        state
      } = body;

      const order = {
        id: orderId || 'YH-' + Date.now(),
        items,
        subtotal,
        discount,
        delivery,
        total,
        customer: { firstName, lastName, phone, address, city, pincode, state },
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
