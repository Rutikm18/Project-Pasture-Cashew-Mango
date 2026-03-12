/**
 * Local dev server (no Vercel). Serves static files + /api/config, /api/notify, /api/order.
 * Run: npm install && npm run dev
 */
const path = require('path');
const fs = require('fs');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || '';

function requireAdmin(req) {
  if (!ADMIN_SECRET) return true;
  return (req.headers['x-admin-key'] || '') === ADMIN_SECRET;
}

// In-memory order store (same as api/order.js)
let orders = [];
// In-memory waitlist (Hapus notify signups)
let waitlist = [];

// JSON body parser for API routes
app.use(express.json());

const configPath = path.join(__dirname, 'config', 'site.json');

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    return null;
  }
}

// API routes (must be before static so PUT /api/config is handled)
// GET /api/config
app.get('/api/config', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
  try {
    const siteConfig = loadConfig();
    if (!siteConfig) throw new Error('Config not found');
    res.status(200).json(siteConfig);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Config not found' });
  }
});

// PUT /api/config (admin only, writes to site.json)
app.put('/api/config', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  if (!requireAdmin(req)) {
    return res.status(401).json({ error: 'Admin access required.' });
  }
  try {
    const body = req.body || {};
    const current = loadConfig() || {};
    const merged = {
      brand: { ...current.brand, ...body.brand },
      delivery: { ...current.delivery, ...body.delivery },
      products: body.products !== undefined ? body.products : current.products,
      coupons: body.coupons !== undefined ? body.coupons : current.coupons
    };
    fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf8');
    res.status(200).json({ ok: true, message: 'Config saved' });
  } catch (e) {
    console.error('[PUT /api/config]', e);
    res.status(500).json({ error: 'Failed to save config: ' + (e.message || String(e)) });
  }
});

app.options('/api/config', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  res.status(204).end();
});

// GET /api/notify — return waitlist (admin only when ADMIN_SECRET set)
app.get('/api/notify', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store');
  if (!requireAdmin(req)) {
    return res.status(401).json({ error: 'Admin access required.' });
  }
  res.status(200).json(waitlist);
});

// Security headers helper
function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
}

// POST /api/notify (Hapus waitlist)
app.post('/api/notify', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  securityHeaders(res);
  try {
    const body = req.body || {};
    const phone = String(body.phone || '').trim().replace(/\D/g, '').slice(-10);
    if (!phone || phone.length < 10) {
      return res.status(400).json({ error: 'Valid phone number required' });
    }
    const entry = { phone: '+91' + phone, at: new Date().toISOString() };
    waitlist.push(entry);
    console.log('[Hapus notify]', entry);
    res.status(200).json({ success: true, message: 'You are on the list!' });
  } catch (e) {
    console.error('[notify]', e);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

app.options('/api/notify', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  res.status(204).end();
});

// GET /api/order (admin only when ADMIN_SECRET set)
app.get('/api/order', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store');
  if (!requireAdmin(req)) {
    return res.status(401).json({ error: 'Admin access required.' });
  }
  res.status(200).json(orders);
});

// POST /api/order
app.post('/api/order', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  securityHeaders(res);
  try {
    const body = req.body || {};
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
    console.log('Order received:', order.id, phone, total);
    res.status(200).json({ ok: true, orderId: order.id });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Invalid order payload' });
  }
});

app.options('/api/order', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  res.status(204).end();
});

// Static files and root redirect (after API routes so PUT /api/config works)
app.get('/', (req, res) => res.redirect(302, '/cashew.html'));
app.use(express.static(__dirname));

function startServer(port) {
  const server = app.listen(port, () => {
    console.log('');
    console.log('  Pasture — local server (no Vercel)');
    console.log('  Open: http://localhost:' + port);
    console.log('  Root redirects to /cashew.html');
    console.log('  API: GET/PUT /api/config, /api/notify, /api/order');
    console.log('');
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log('  Port ' + port + ' in use, trying ' + (port + 1) + '...');
      startServer(port + 1);
    } else {
      throw err;
    }
  });
}

startServer(PORT);
