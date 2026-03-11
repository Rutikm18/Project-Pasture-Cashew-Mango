// Hapus waitlist signup — stores submission and returns success.
// For production you can wire this to Vercel KV, Airtable, or email.

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
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

    // Optional: log to Vercel logs or send to external service
    console.log('[Hapus notify]', { phone, at: new Date().toISOString() });

    return res.status(200).json({ success: true, message: 'You are on the list!' });
  } catch (e) {
    console.error('[notify]', e);
    return res.status(500).json({ error: 'Something went wrong' });
  }
};
