import { syncMma } from '../lib/scrape.js';

export default async function handler(req, res) {
  try {
    const offset = Math.max(0, Number(req.query.offset || 0));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)));
    const persist = String(req.query.persist ?? '1') !== '0';
    const result = await syncMma({ offset, limit, concurrency: 5, persist });
    res.status(200).json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}
