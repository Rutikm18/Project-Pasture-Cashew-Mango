const ADMIN_SECRET = process.env.ADMIN_SECRET || '';
const ANALYTICS_MAX = 2000;
// In-memory per function instance (serverless: may reset; for persistence use Netlify KV or DB)
let analyticsEvents = [];

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
    const pageviews = analyticsEvents.filter((e) => e.type === 'pageview').length;
    const clicks = analyticsEvents.filter((e) => e.type === 'click').length;
    const payload = {
      events: analyticsEvents,
      summary: { pageviews, clicks, total: analyticsEvents.length }
    };
    return {
      statusCode: 200,
      headers: { ...corsHeaders('GET, POST, OPTIONS'), 'Cache-Control': 'no-store' },
      body: JSON.stringify(payload)
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders('GET, POST, OPTIONS'),
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const ip = (event.headers && (event.headers['x-forwarded-for'] || event.headers['x-client-ip'] || event.headers['client-ip'])) || '';
    const eventRecord = {
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
      ip: (typeof ip === 'string' ? ip : (ip && ip.split(',')[0]) || '').trim().slice(0, 45)
    };
    analyticsEvents.push(eventRecord);
    if (analyticsEvents.length > ANALYTICS_MAX) {
      analyticsEvents = analyticsEvents.slice(-ANALYTICS_MAX);
    }
    return {
      statusCode: 200,
      headers: corsHeaders('GET, POST, OPTIONS'),
      body: JSON.stringify({ ok: true })
    };
  } catch (e) {
    console.error('[analytics]', e);
    return {
      statusCode: 400,
      headers: corsHeaders('GET, POST, OPTIONS'),
      body: JSON.stringify({ error: 'Invalid payload' })
    };
  }
};
