const defaultConfig = require('../../config/site.json');

const ADMIN_SECRET = process.env.ADMIN_SECRET || '';

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

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  if (event.httpMethod === 'GET') {
    // On Netlify, we treat config as read-only and bundle site.json at build time.
    return {
      statusCode: 200,
      headers: { ...corsHeaders(), 'Cache-Control': 'no-store' },
      body: JSON.stringify(defaultConfig)
    };
  }

  if (event.httpMethod === 'PUT') {
    if (!requireAdmin(event)) {
      return {
        statusCode: 401,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'Admin access required.' })
      };
    }
    // Netlify Functions cannot persist writes to the deployed filesystem.
    // Make this explicit instead of failing with 500.
    return {
      statusCode: 501,
      headers: corsHeaders(),
      body: JSON.stringify({
        error:
          'Config editing is not supported on Netlify (read-only deploy). Run locally with "npm run dev" to edit config/site.json.'
      })
    };
  }

  return {
    statusCode: 405,
    headers: { ...corsHeaders(), Allow: 'GET, PUT, OPTIONS' },
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};

