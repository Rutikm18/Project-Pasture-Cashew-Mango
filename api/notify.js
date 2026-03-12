// Hapus waitlist signup — stores in memory; GET returns list for admin.
// Security: validation, rate limit, headers. For production wire to Vercel KV.

let waitlist = [];
const rateLimit = new Map(); // ip -> { count, resetAt }
const RATE_LIMIT = 5;
const RATE_WINDOW = 60 * 1000; // 1 min

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
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    if (!requireAdmin(req)) {
      return res.status(401).json({ error: 'Admin access required. Set ADMIN_SECRET and use X-Admin-Key header.' });
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(waitlist);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getIp(req);
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  try {
    const body = getBody(req);
    const rawPhone = (body.phone || '').trim();
    const phone = rawPhone.replace(/\D/g, '').slice(-10);

    if (!phone || phone.length < 10) {
      return res.status(400).json({ error: 'Valid phone number required' });
    }

    const entry = { phone: '+91' + phone, at: new Date().toISOString() };
    waitlist.push(entry);
    console.log('[Hapus notify]', entry);

    return res.status(200).json({ success: true, message: 'You are on the list!' });
  } catch (e) {
    console.error('[notify]', e);
    return res.status(500).json({ error: 'Something went wrong' });
  }
};
