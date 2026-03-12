/**
 * GET /api/config — returns site config (from file or Vercel KV)
 * PUT /api/config — saves config (admin only; Vercel KV if configured, else 501)
 */
const path = require('path');
const fs = require('fs');

const CONFIG_KEY = 'pasture_site_config';
const ADMIN_SECRET = process.env.ADMIN_SECRET || '';

function allowCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
}

function requireAdmin(req) {
  if (!ADMIN_SECRET) return true;
  return (req.headers['x-admin-key'] || '') === ADMIN_SECRET;
}

async function loadFromFile() {
  try {
    const configPath = path.join(__dirname, '..', 'config', 'site.json');
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    return null;
  }
}

module.exports = async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  allowCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    try {
      let siteConfig = null;
      if (process.env.KV_REST_API_URL) {
        try {
          const { kv } = require('@vercel/kv');
          siteConfig = await kv.get(CONFIG_KEY);
        } catch (_) {}
      }
      if (!siteConfig) siteConfig = await loadFromFile();
      if (!siteConfig) throw new Error('Config not found');
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
      res.status(200).json(siteConfig);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Config not found' });
    }
    return;
  }

  if (req.method === 'PUT') {
    if (!requireAdmin(req)) {
      return res.status(401).json({ error: 'Admin access required.' });
    }
    try {
      if (!process.env.KV_REST_API_URL) {
        return res.status(501).json({ error: 'Config editing not available on Vercel. Add Vercel KV (Storage) to your project, or run locally with npm run dev.' });
      }
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const { kv } = require('@vercel/kv');
      const current = await kv.get(CONFIG_KEY) || await loadFromFile() || {};
      const merged = {
        brand: { ...current.brand, ...body.brand },
        delivery: { ...current.delivery, ...body.delivery },
        products: body.products !== undefined ? body.products : current.products,
        coupons: body.coupons !== undefined ? body.coupons : current.coupons
      };
      await kv.set(CONFIG_KEY, merged);
      res.status(200).json({ ok: true, message: 'Config saved' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to save config' });
    }
    return;
  }

  res.setHeader('Allow', 'GET, PUT, OPTIONS');
  res.status(405).json({ error: 'Method not allowed' });
};
