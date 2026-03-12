const ADMIN_SECRET = process.env.ADMIN_SECRET || '';

let orders = [];

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
      body: JSON.stringify(orders)
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

    const id = orderId || 'YH-' + Date.now();
    const order = {
      id,
      items,
      subtotal,
      discount,
      delivery,
      total,
      customer: { firstName, lastName, phone, address, city, pincode, state },
      at: new Date().toISOString()
    };
    orders.push(order);
    console.log('Order received:', id, phone, total);

    return {
      statusCode: 200,
      headers: corsHeaders('GET, POST, OPTIONS'),
      body: JSON.stringify({ ok: true, orderId: id })
    };
  } catch (e) {
    console.error('[order]', e);
    return {
      statusCode: 400,
      headers: corsHeaders('GET, POST, OPTIONS'),
      body: JSON.stringify({ error: 'Invalid order payload' })
    };
  }
};

