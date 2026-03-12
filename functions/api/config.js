import defaultConfig from '../../config/site.json';
import { jsonResponse, textResponse, isAdmin, readJsonBody } from './_util.js';

const CONFIG_KEY = 'pasture_site_config';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') return textResponse('', { status: 204 });

  if (!env.PASTURE_KV) {
    return jsonResponse(
      {
        error:
          'Cloudflare KV is not configured. Create a KV namespace and bind it as PASTURE_KV in Cloudflare Pages.'
      },
      { status: 500 }
    );
  }

  if (request.method === 'GET') {
    const fromKV = await env.PASTURE_KV.get(CONFIG_KEY, { type: 'json' });
    const cfg = fromKV || defaultConfig;
    return jsonResponse(cfg, {
      status: 200,
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate' }
    });
  }

  if (request.method === 'PUT') {
    if (!isAdmin(request, env)) {
      return jsonResponse({ error: 'Admin access required.' }, { status: 401 });
    }
    const body = await readJsonBody(request);
    const current = (await env.PASTURE_KV.get(CONFIG_KEY, { type: 'json' })) || defaultConfig || {};
    const merged = {
      brand: { ...(current.brand || {}), ...(body.brand || {}) },
      delivery: { ...(current.delivery || {}), ...(body.delivery || {}) },
      products: body.products !== undefined ? body.products : current.products,
      coupons: body.coupons !== undefined ? body.coupons : current.coupons
    };
    await env.PASTURE_KV.put(CONFIG_KEY, JSON.stringify(merged));
    return jsonResponse({ ok: true, message: 'Config saved' }, { status: 200 });
  }

  return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
}

