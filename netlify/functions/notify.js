const path = require('path');

const ADMIN_SECRET = process.env.ADMIN_SECRET || '';

let waitlist = [];

function corsHeaders(methods) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': methods,
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
    return { statusCode: 204, headers: corsHeaders('GET, POST, OPTIONS'), body: '' };
  }

  if (event.httpMethod === 'GET') {
    if (!requireAdmin(event)) {
      return {
        statusCode: 401,
        headers: { ...corsHeaders('GET, POST, OPTIONS'), 'Cache-Control': 'no-store' },
        body: JSON.stringify({ error: 'Admin access required.' })
      };
    }
    return {
      statusCode: 200,
      headers: { ...corsHeaders('GET, POST, OPTIONS'), 'Cache-Control': 'no-store' },
      body: JSON.stringify(waitlist)
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders('GET, POST, OPTIONS'), Allow: 'GET, POST, OPTIONS' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const rawPhone = String(body.phone || '').trim();
    const phone = rawPhone.replace(/\D/g, '').slice(-10);

    if (!phone || phone.length < 10) {
      return {
        statusCode: 400,
        headers: corsHeaders('GET, POST, OPTIONS'),
        body: JSON.stringify({ error: 'Valid phone number required' })
      };
    }

    const entry = { phone: '+91' + phone, at: new Date().toISOString() };
    waitlist.push(entry);
    console.log('[Hapus notify]', entry);

    return {
      statusCode: 200,
      headers: corsHeaders('GET, POST, OPTIONS'),
      body: JSON.stringify({ success: true, message: 'You are on the list!' })
    };
  } catch (e) {
    console.error('[notify]', e);
    return {
      statusCode: 500,
      headers: corsHeaders('GET, POST, OPTIONS'),
      body: JSON.stringify({ error: 'Something went wrong' })
    };
  }
};

