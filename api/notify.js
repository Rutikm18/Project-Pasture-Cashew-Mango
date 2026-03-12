// Hapus waitlist signup — stores in memory; GET returns list for admin.
// For production you can wire to Vercel KV, Airtable, or email.

let waitlist = [];

function allowCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  allowCors(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(waitlist);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const phone = (body.phone || '').trim().replace(/\D/g, '').slice(-10);

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
