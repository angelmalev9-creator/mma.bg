import { storageStatus } from '../lib/store.js';

export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    robot: 'mma.bg',
    version: '1.0.0-vercel',
    storage: storageStatus(),
    endpoints: {
      discover: '/api/discover',
      product: '/api/product?url=PRODUCT_URL',
      sync: '/api/sync?limit=10&offset=0',
      cron: '/api/cron'
    }
  });
}
