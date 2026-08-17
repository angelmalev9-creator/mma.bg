import { fetchHtml } from './http.js';
import { mmaBg } from './sources/mma-bg.js';
import { saveProducts } from './store.js';

export async function discoverMma() {
  const all = [];
  for (const seed of mmaBg.seeds) {
    const html = await fetchHtml(seed.url);
    for (const url of mmaBg.discover(html, seed)) all.push({ url, seed });
  }
  return [...new Map(all.map(x => [x.url, x])).values()];
}

export async function scrapeOne(url, seed = mmaBg.seeds[0]) {
  if (!url.startsWith('https://mma.bg/')) throw new Error('Позволени са само mma.bg URL адреси');
  const html = await fetchHtml(url);
  const product = mmaBg.parseProduct(html, url, seed);
  if (!product.title) throw new Error('Не е намерено име на продукта');
  return product;
}

async function mapWithConcurrency(items, concurrency, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return out;
}

export async function syncMma({ offset = 0, limit = 20, concurrency = 5, persist = true } = {}) {
  const discovered = await discoverMma();
  const selected = discovered.slice(offset, offset + limit);
  const errors = [];

  const rows = await mapWithConcurrency(selected, concurrency, async ({ url, seed }) => {
    try {
      return await scrapeOne(url, seed);
    } catch (error) {
      errors.push({ url, message: error.message });
      return null;
    }
  });

  const products = rows.filter(Boolean);
  const storage = persist ? await saveProducts(products) : { enabled: false, saved: 0 };
  return {
    source: mmaBg.id,
    totalDiscovered: discovered.length,
    offset,
    requested: selected.length,
    scraped: products.length,
    errors,
    nextOffset: offset + selected.length < discovered.length ? offset + selected.length : null,
    storage,
    products
  };
}
