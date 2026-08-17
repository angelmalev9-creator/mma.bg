import { syncMma } from '../lib/scrape.js';

export default async function handler(req, res) {
  try {
    if (process.env.CRON_SECRET) {
      const auth = req.headers.authorization;
      if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }
    }

    // Up to 50 products per run; enough for testing on Vercel Hobby.
    // For production we split all sources into batches / queue.
    const result = await syncMma({ offset: 0, limit: 50, concurrency: 5, persist: true });
    res.status(200).json({ ok: true, cron: true, ...result, products: undefined });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}
