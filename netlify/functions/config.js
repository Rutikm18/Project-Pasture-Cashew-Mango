const path = require('path');
const fs = require('fs');

const ADMIN_SECRET = process.env.ADMIN_SECRET || '';
const configPath = path.join(__dirname, '..', '..', 'config', 'site.json');

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
  };
}

function requireAdmin(event) {
  if (!ADMIN_SECRET) return true;
  const key = (event.headers && (event.headers['x-admin-key'] || event.headers['X-Admin-Key'])) || '';
  return key === ADMIN_SECRET;
}

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (_) {
    return null;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  if (event.httpMethod === 'GET') {
    try {
      const siteConfig = loadConfig();
      if (!siteConfig) throw new Error('Config not found');
      return {
        statusCode: 200,
        headers: { ...corsHeaders(), 'Cache-Control': 'no-store' },
        body: JSON.stringify(siteConfig)
      };
    } catch (e) {
      console.error(e);
      return {
        statusCode: 500,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'Config not found' })
      };
    }
  }

  if (event.httpMethod === 'PUT') {
    if (!requireAdmin(event)) {
      return {
        statusCode: 401,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'Admin access required.' })
      };
    }
    try {
      const body = event.body ? JSON.parse(event.body) : {};
      const current = loadConfig() || {};
      const merged = {
        brand: { ...(current.brand || {}), ...(body.brand || {}) },
        delivery: { ...(current.delivery || {}), ...(body.delivery || {}) },
        products: body.products !== undefined ? body.products : current.products,
        coupons: body.coupons !== undefined ? body.coupons : current.coupons
      };
      fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf8');
      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify({ ok: true, message: 'Config saved' })
      };
    } catch (e) {
      console.error('[PUT /api/config]', e);
      return {
        statusCode: 500,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'Failed to save config: ' + (e.message || String(e)) })
      };
    }
  }

  return {
    statusCode: 405,
    headers: { ...corsHeaders(), Allow: 'GET, PUT, OPTIONS' },
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};

