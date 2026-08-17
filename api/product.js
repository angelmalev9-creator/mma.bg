import { scrapeOne } from '../lib/scrape.js';

export default async function handler(req, res) {
  try {
    const url = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
    if (!url) return res.status(400).json({ ok: false, error: 'Липсва ?url=' });
    const product = await scrapeOne(url);
    res.status(200).json({ ok: true, product });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}
