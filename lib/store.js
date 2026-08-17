import { hashObject } from './utils.js';

function configured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function supabase(path, options = {}) {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error('Supabase не е конфигуриран');
  const response = await fetch(`${base}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates,return=representation',
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function saveProducts(products) {
  if (!configured()) return { enabled: false, saved: 0 };
  if (!products.length) return { enabled: true, saved: 0 };

  const rows = products.map(p => ({
    source: p.source,
    source_url: p.sourceUrl,
    source_product_id: p.sourceProductId,
    sku: p.sku,
    title: p.title,
    brand: p.brand,
    category: p.category,
    description: p.description,
    currency: p.currency,
    source_price: p.sourcePrice,
    in_stock: p.inStock,
    status: p.status,
    sizes: p.sizes,
    images: p.images,
    raw_hash: hashObject(p),
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  const result = await supabase('products?on_conflict=source,source_url', {
    method: 'POST',
    body: JSON.stringify(rows)
  });
  return { enabled: true, saved: Array.isArray(result) ? result.length : rows.length };
}

export function storageStatus() {
  return { type: configured() ? 'supabase' : 'live-only', configured: configured() };
}
