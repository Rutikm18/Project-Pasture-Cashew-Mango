/**
 * Local dev server (no Vercel). Serves static files + /api/config, /api/notify, /api/order.
 * Run: npm install && npm run dev
 */
const path = require('path');
const fs = require('fs');
const express = require('express');
const nodemailer = require('nodemailer');
const { Client: NotionClient } = require('@notionhq/client');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || '';

function requireAdmin(req) {
  if (!ADMIN_SECRET) return true;
  return (req.headers['x-admin-key'] || '') === ADMIN_SECRET;
}

// ── Persistent JSON file store ──────────────────────────────────────────────
// Data is written to /data/*.json so it survives process restarts.
// On Cloud Run (ephemeral filesystem) this still resets on redeploy/scale-to-zero.
// For true persistence on Cloud Run, migrate to Firestore.
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8')); }
  catch (e) { return fallback; }
}

function saveJson(file, data) {
  try { fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data), 'utf8'); }
  catch (e) { console.error('[saveJson]', file, e.message); }
}

let orders         = loadJson('orders.json', []);
let waitlist       = loadJson('waitlist.json', []);
let analyticsEvents = loadJson('analytics.json', []);
const ANALYTICS_MAX = 2000;

// ── WhatsApp notifications via CallMeBot ────────────────────────────────────
// Setup: save +34 644 49 74 69 on WhatsApp, send "I allow callmebot to send me messages"
// You'll receive an apikey — set it as env var: WA_KEY_1 and WA_KEY_2
const WA_NUMBERS = [
  { phone: '919404598725', key: process.env.WA_KEY_1 },
  { phone: '919325848094', key: process.env.WA_KEY_2 },
];

function sendWhatsApp(phone, key, text) {
  if (!key) return; // skip if key not configured yet
  const url = 'https://api.callmebot.com/whatsapp.php?phone=' + phone +
    '&text=' + encodeURIComponent(text) + '&apikey=' + key;
  // Use built-in https — no extra dependency needed
  const https = require('https');
  https.get(url, (res) => {
    console.log('[WhatsApp]', phone, res.statusCode);
  }).on('error', (e) => {
    console.error('[WhatsApp error]', phone, e.message);
  });
}

function notifyOrder(order) {
  const items = (order.items || []).map((i) => i.name + ' x' + i.qty).join(', ');
  const text =
    '🛒 New Pasture Order!\n' +
    'ID: ' + order.id + '\n' +
    'Customer: ' + order.customer.firstName + ' ' + order.customer.lastName + '\n' +
    'Phone: ' + order.customer.phone + '\n' +
    'Items: ' + items + '\n' +
    'Total: ₹' + order.total + '\n' +
    'Payment: ' + order.paymentMethod + '\n' +
    'City: ' + order.customer.city + ', ' + order.customer.pincode + '\n' +
    'Time: ' + order.time;
  WA_NUMBERS.forEach((n) => sendWhatsApp(n.phone, n.key, text));
}

function notifyWaitlist(entry, grade) {
  const text =
    '📋 Pasture Notify Signup\n' +
    'Grade: ' + (grade || 'Hapus') + '\n' +
    'Phone: ' + entry.phone + '\n' +
    'Time: ' + entry.at;
  WA_NUMBERS.forEach((n) => sendWhatsApp(n.phone, n.key, text));
}

// ── Notion integration ──────────────────────────────────────────────────────
const NOTION_TOKEN        = process.env.NOTION_TOKEN        || '';
const NOTION_ORDERS_DB    = process.env.NOTION_ORDERS_DB    || '310ac92a82204fee9ae32c3f6db50f0c';
const NOTION_ANALYTICS_DB = process.env.NOTION_ANALYTICS_DB || 'bffa6f56d2c546db9bb8c564726adf43';

const notion = new NotionClient({ auth: NOTION_TOKEN });

async function notionAddOrder(order) {
  try {
    const items = (order.items || []).map((i) => i.name + ' x' + i.qty).join(', ');
    await notion.pages.create({
      parent: { database_id: NOTION_ORDERS_DB },
      properties: {
        'Order ID':      { title:  [{ text: { content: order.id || '' } }] },
        'Customer Name': { rich_text: [{ text: { content: (order.customer.firstName + ' ' + order.customer.lastName).trim() } }] },
        'Phone':         { phone_number: order.customer.phone || '' },
        'Items':         { rich_text: [{ text: { content: items } }] },
        'Total':         { number: Number(order.total) || 0 },
        'Payment':       { select: { name: order.paymentMethod || 'COD' } },
        'Address':       { rich_text: [{ text: { content: order.customer.address || '' } }] },
        'City':          { rich_text: [{ text: { content: order.customer.city || '' } }] },
        'Pincode':       { rich_text: [{ text: { content: String(order.customer.pincode || '') } }] },
        'Status':        { select: { name: 'New' } },
        'Time':          { date: { start: order.at || new Date().toISOString() } },
      }
    });
    console.log('[Notion] order added:', order.id);
  } catch (e) {
    console.error('[Notion order error]', e.message);
  }
}

async function notionAddAnalytics(summary) {
  try {
    await notion.pages.create({
      parent: { database_id: NOTION_ANALYTICS_DB },
      properties: {
        'Period':        { title:  [{ text: { content: summary.period } }] },
        'Pageviews':     { number: summary.pageviews },
        'Clicks':        { number: summary.clicks },
        'Total Orders':  { number: summary.totalOrders },
        'New Signups':   { number: summary.newSignups },
        'Top Page':      { rich_text: [{ text: { content: summary.topPage || '' } }] },
        'Recorded At':   { date: { start: new Date().toISOString() } },
      }
    });
    console.log('[Notion] analytics snapshot saved');
  } catch (e) {
    console.error('[Notion analytics error]', e.message);
  }
}

// Snapshot counters — reset every 3 hrs to track "new in this period"
let snapshotOrders  = orders.length;
let snapshotSignups = waitlist.length;

function runAnalyticsSnapshot() {
  const pageviews = analyticsEvents.filter((e) => e.type === 'pageview').length;
  const clicks    = analyticsEvents.filter((e) => e.type === 'click').length;
  const pages = {};
  analyticsEvents.filter((e) => e.type === 'pageview').forEach((e) => {
    const p = e.page || e.url || 'unknown';
    pages[p] = (pages[p] || 0) + 1;
  });
  const topPage = Object.entries(pages).sort((a, b) => b[1] - a[1])[0];
  const now = new Date();
  const period = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

  const summary = {
    period,
    pageviews,
    clicks,
    totalOrders:  orders.length,
    newSignups:   waitlist.length - snapshotSignups,
    topPage:      topPage ? topPage[0] + ' (' + topPage[1] + ')' : '',
  };

  notionAddAnalytics(summary);
  snapshotOrders  = orders.length;
  snapshotSignups = waitlist.length;
}

// Run analytics snapshot every 3 hours
setInterval(runAnalyticsSnapshot, 3 * 60 * 60 * 1000);

// ── Gmail notifications ─────────────────────────────────────────────────────
// Set env vars: GMAIL_USER (your Gmail address) + GMAIL_PASS (16-char App Password)
// Get App Password: Google Account → Security → 2-Step Verification → App passwords
const NOTIFY_TO = 'hello@pasture.online';
let mailer = null;

function getMailer() {
  if (mailer) return mailer;
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) return null;
  mailer = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
  });
  return mailer;
}

function sendMail(subject, html) {
  const t = getMailer();
  if (!t) return;
  t.sendMail({
    from: '"Pasture Farm" <' + process.env.GMAIL_USER + '>',
    to: NOTIFY_TO,
    subject: subject,
    html: html
  }, (err) => {
    if (err) console.error('[Gmail]', err.message);
    else console.log('[Gmail] sent:', subject);
  });
}

function mailOrder(order) {
  const items = (order.items || [])
    .map((i) => '<tr><td style="padding:4px 8px">' + i.name + '</td><td style="padding:4px 8px">x' + i.qty + '</td><td style="padding:4px 8px">₹' + i.price + '</td></tr>')
    .join('');
  const html =
    '<div style="font-family:sans-serif;max-width:520px;color:#1C0F06">' +
    '<h2 style="background:#1C0F06;color:#E8B94A;padding:16px 20px;margin:0">🛒 New Order — Pasture</h2>' +
    '<div style="padding:20px;border:1px solid #e0d0b0">' +
    '<p><strong>Order ID:</strong> ' + order.id + '</p>' +
    '<p><strong>Time:</strong> ' + order.time + '</p>' +
    '<p><strong>Customer:</strong> ' + order.customer.firstName + ' ' + order.customer.lastName + '</p>' +
    '<p><strong>Phone:</strong> ' + order.customer.phone + '</p>' +
    '<p><strong>Address:</strong> ' + order.customer.address + ', ' + order.customer.city + ' — ' + order.customer.pincode + ', ' + order.customer.state + '</p>' +
    '<p><strong>Payment:</strong> ' + order.paymentMethod + '</p>' +
    '<table style="width:100%;border-collapse:collapse;margin-top:12px;border:1px solid #e0d0b0"><thead><tr style="background:#f5e6c0"><th style="padding:6px 8px;text-align:left">Item</th><th style="padding:6px 8px">Qty</th><th style="padding:6px 8px">Price</th></tr></thead><tbody>' + items + '</tbody></table>' +
    '<p style="margin-top:12px"><strong>Subtotal:</strong> ₹' + order.subtotal + '</p>' +
    (order.discount ? '<p><strong>Discount:</strong> -₹' + order.discount + '</p>' : '') +
    '<p><strong>Delivery:</strong> ₹' + order.delivery + '</p>' +
    '<p style="font-size:1.15rem"><strong>Total: ₹' + order.total + '</strong></p>' +
    '</div></div>';
  sendMail('🛒 New Order #' + order.id + ' — ₹' + order.total, html);
}

function mailNotify(entry, grade) {
  const html =
    '<div style="font-family:sans-serif;max-width:520px;color:#1C0F06">' +
    '<h2 style="background:#1A3D0C;color:#8FBF5E;padding:16px 20px;margin:0">📋 New Notify Signup — Pasture</h2>' +
    '<div style="padding:20px;border:1px solid #e0d0b0">' +
    '<p><strong>Grade / Product:</strong> ' + (grade || 'Unknown') + '</p>' +
    '<p><strong>Phone:</strong> ' + entry.phone + '</p>' +
    '<p><strong>Time:</strong> ' + entry.at + '</p>' +
    '</div></div>';
  sendMail('📋 Notify Signup — ' + (grade || 'Pasture'), html);
}

// Daily analytics summary — sent every 24 hours while server is running
function sendAnalyticsSummary() {
  const pageviews = analyticsEvents.filter((e) => e.type === 'pageview').length;
  const clicks    = analyticsEvents.filter((e) => e.type === 'click').length;
  const total     = analyticsEvents.length;
  const pages = {};
  analyticsEvents.filter((e) => e.type === 'pageview').forEach((e) => {
    pages[e.page || e.url || 'unknown'] = (pages[e.page || e.url || 'unknown'] || 0) + 1;
  });
  const pageRows = Object.entries(pages)
    .sort((a, b) => b[1] - a[1])
    .map(([p, c]) => '<tr><td style="padding:4px 8px">' + p + '</td><td style="padding:4px 8px">' + c + '</td></tr>')
    .join('');
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  const html =
    '<div style="font-family:sans-serif;max-width:520px;color:#1C0F06">' +
    '<h2 style="background:#3B1F0C;color:#F2D98B;padding:16px 20px;margin:0">📊 Daily Summary — Pasture</h2>' +
    '<div style="padding:20px;border:1px solid #e0d0b0">' +
    '<p><strong>As of:</strong> ' + now + '</p>' +
    '<p>📦 <strong>Total Orders:</strong> ' + orders.length + '</p>' +
    '<p>📋 <strong>Notify Signups:</strong> ' + waitlist.length + '</p>' +
    '<p>👁 <strong>Pageviews:</strong> ' + pageviews + '</p>' +
    '<p>🖱 <strong>Clicks tracked:</strong> ' + clicks + '</p>' +
    (pageRows ? '<h3 style="margin-top:16px">Pages</h3><table style="width:100%;border-collapse:collapse;border:1px solid #e0d0b0"><thead><tr style="background:#f5e6c0"><th style="padding:6px 8px;text-align:left">Page</th><th style="padding:6px 8px">Views</th></tr></thead><tbody>' + pageRows + '</tbody></table>' : '') +
    '</div></div>';
  sendMail('📊 Daily Summary — Pasture (' + now + ')', html);
}

// Schedule daily summary at 9 AM IST (UTC+5:30 = 3:30 AM UTC)
function scheduleDailySummary() {
  const now = new Date();
  const nextRun = new Date();
  nextRun.setUTCHours(3, 30, 0, 0); // 9:00 AM IST
  if (nextRun <= now) nextRun.setUTCDate(nextRun.getUTCDate() + 1);
  const delay = nextRun - now;
  setTimeout(function tick() {
    sendAnalyticsSummary();
    setTimeout(tick, 24 * 60 * 60 * 1000);
  }, delay);
  console.log('  Daily summary scheduled for', nextRun.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
}

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
    const grade = String(body.grade || '').trim() || 'Hapus Mango';
    const entry = { phone: '+91' + phone, grade, at: new Date().toISOString() };
    waitlist.push(entry);
    saveJson('waitlist.json', waitlist);
    notifyWaitlist(entry, grade);
    mailNotify(entry, grade);
    console.log('[notify]', grade, entry.phone);
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

// GET /api/analytics (admin only when ADMIN_SECRET set)
app.get('/api/analytics', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  if (!requireAdmin(req)) {
    return res.status(401).json({ error: 'Admin access required.' });
  }
  const pageviews = analyticsEvents.filter((e) => e.type === 'pageview').length;
  const clicks = analyticsEvents.filter((e) => e.type === 'click').length;
  res.status(200).json({
    events: analyticsEvents,
    summary: { pageviews, clicks, total: analyticsEvents.length }
  });
});

// POST /api/analytics (record pageview / click from frontend)
app.post('/api/analytics', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  securityHeaders(res);
  try {
    const body = req.body || {};
    const ip = req.ip || req.headers['x-forwarded-for'] || (req.connection && req.connection.remoteAddress) || '';
    const event = {
      type: body.type || 'event',
      page: body.page || '',
      url: body.url || '',
      referrer: body.referrer || '',
      userAgent: (body.userAgent || '').slice(0, 400),
      screen: body.screen || {},
      element: body.element || '',
      text: (body.text || '').slice(0, 120),
      href: (body.href || '').slice(0, 300),
      timestamp: body.timestamp || new Date().toISOString(),
      serverTime: new Date().toISOString(),
      ip: (typeof ip === 'string' ? ip : (ip && ip[0]) || '').slice(0, 45)
    };
    analyticsEvents.push(event);
    if (analyticsEvents.length > ANALYTICS_MAX) analyticsEvents = analyticsEvents.slice(-ANALYTICS_MAX);
    saveJson('analytics.json', analyticsEvents);
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[analytics]', e);
    res.status(400).json({ error: 'Invalid payload' });
  }
});

app.options('/api/analytics', (req, res) => {
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
      state,
      paymentMethod
    } = body;

    const now = new Date();
    const order = {
      id: orderId || 'YH-' + Date.now(),
      items,
      subtotal,
      discount,
      delivery,
      total,
      customer: { firstName, lastName, phone, address, city, pincode, state },
      at: now.toISOString(),
      time: now.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short'
      }),
      paymentMethod: paymentMethod || 'COD'
    };
    orders.push(order);
    saveJson('orders.json', orders);
    notifyOrder(order);
    mailOrder(order);
    notionAddOrder(order);
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
    console.log('  Pages: cashew.html, mango.html, order.html, admin.html');
    console.log('  API: GET/PUT /api/config, /api/notify, /api/order, /api/analytics');
    console.log('  Email:', process.env.GMAIL_USER ? 'configured (' + process.env.GMAIL_USER + ')' : 'not configured — set GMAIL_USER + GMAIL_PASS');
    console.log('');
    scheduleDailySummary();
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
