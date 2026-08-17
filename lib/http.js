const DEFAULT_HEADERS = {
  'user-agent': 'Mozilla/5.0 (compatible; ProductMonitor/1.0; +https://vercel.app)',
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'bg-BG,bg;q=0.9,en;q=0.7'
};

export async function fetchHtml(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: DEFAULT_HEADERS,
      redirect: 'follow',
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} за ${url}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}
