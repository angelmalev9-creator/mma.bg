import { discoverMma } from '../lib/scrape.js';

export default async function handler(req, res) {
  try {
    const rows = await discoverMma();
    res.status(200).json({ ok: true, source: 'mma.bg', count: rows.length, products: rows.map(x => x.url) });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}
