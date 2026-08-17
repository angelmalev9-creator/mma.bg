import * as cheerio from 'cheerio';
import { absoluteUrl, cleanText, currencyFromText, parseMoney, uniq } from '../utils.js';

export const mmaBg = {
  id: 'mma.bg',
  label: 'MMA.bg',
  seeds: [
    {
      url: 'https://mma.bg/shop/ekipirovka/mma-grapling-rykavici',
      category: 'MMA/Граплинг ръкавици'
    }
  ],

  discover(html, seed) {
    const $ = cheerio.load(html);
    const seedUrl = new URL(seed.url);
    const seedPath = seedUrl.pathname.replace(/\/$/, '');
    const seedDepth = seedPath.split('/').filter(Boolean).length;
    const found = [];

    $('a[href]').each((_, el) => {
      const href = absoluteUrl($(el).attr('href'), seed.url);
      if (!href) return;
      let u;
      try { u = new URL(href); } catch { return; }
      if (u.hostname !== seedUrl.hostname) return;
      const path = u.pathname.replace(/\/$/, '');
      if (!path.startsWith(seedPath + '/')) return;
      const depth = path.split('/').filter(Boolean).length;
      if (depth <= seedDepth) return;
      if (/\/compare|\/wishlist|\/cart|\/checkout/i.test(path)) return;
      found.push(u.origin + path);
    });

    return uniq(found);
  },

  parseProduct(html, url, seed) {
    const $ = cheerio.load(html);
    const bodyText = cleanText($('body').text());

    let jsonProduct = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const parsed = JSON.parse($(el).text());
        const candidates = Array.isArray(parsed) ? parsed : (parsed?.['@graph'] || [parsed]);
        for (const item of candidates) {
          const type = item?.['@type'];
          if (type === 'Product' || (Array.isArray(type) && type.includes('Product'))) {
            jsonProduct = item;
            return false;
          }
        }
      } catch {}
    });

    const title = cleanText(jsonProduct?.name || $('h1').first().text() || $('meta[property="og:title"]').attr('content'));
    const sku = cleanText(jsonProduct?.sku || bodyText.match(/Код:\s*([A-Za-z0-9._\/-]+)/i)?.[1] || '');

    const brandFromJson = typeof jsonProduct?.brand === 'string' ? jsonProduct.brand : jsonProduct?.brand?.name;
    let brand = cleanText(brandFromJson || '');
    if (!brand) brand = cleanText($('a[href*="/brands/"], a[href*="manufacturer"]').first().text());
    if (!brand) brand = cleanText(bodyText.match(/Производител:\s*([^|]+?)\s+Категория:/i)?.[1] || '');

    const offer = Array.isArray(jsonProduct?.offers) ? jsonProduct.offers[0] : jsonProduct?.offers;
    const structuredPrice = offer?.price ?? $('meta[property="product:price:amount"]').attr('content') ?? $('[itemprop="price"]').first().attr('content');
    const structuredCurrency = offer?.priceCurrency ?? $('meta[property="product:price:currency"]').attr('content');

    const titleNode = $('h1').first();
    const localScope = titleNode.closest('main, article, .product-info, .product-page, #content').first();
    const localText = cleanText((localScope.length ? localScope : $('body')).text());
    const priceTextCandidate = (localText.match(/\d+[.,]\d{2}\s*(?:€|лв\.?)/i) || [])[0] || '';
    const sourcePrice = structuredPrice != null ? Number(structuredPrice) : parseMoney(priceTextCandidate);
    const currency = cleanText(structuredCurrency || currencyFromText(priceTextCandidate) || 'EUR').toUpperCase();

    const sizes = [];
    $('select').each((_, select) => {
      const parentText = cleanText($(select).parent().text());
      const prevText = cleanText($(select).prevAll('label, span, div').first().text());
      if (!/размер|size/i.test(parentText + ' ' + prevText)) return;
      $(select).find('option').each((__, option) => {
        const value = cleanText($(option).text());
        if (value && !/избери|choose|select|--/i.test(value)) sizes.push(value);
      });
    });

    let description = cleanText(jsonProduct?.description || '');
    if (!description) {
      for (const selector of ['#tab-description', '.product-description', '[itemprop="description"]', '.description']) {
        const text = cleanText($(selector).first().text());
        if (text.length > description.length) description = text;
      }
    }
    if (!description) description = cleanText($('meta[name="description"]').attr('content') || '');

    let images = [];
    if (Array.isArray(jsonProduct?.image)) images.push(...jsonProduct.image);
    else if (typeof jsonProduct?.image === 'string') images.push(jsonProduct.image);
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) images.push(ogImage);
    $('[data-zoom-image], .product-info img, .product-gallery img, [itemprop="image"]').each((_, img) => {
      images.push($(img).attr('data-zoom-image') || $(img).attr('data-src') || $(img).attr('src'));
    });
    images = uniq(images.map(src => absoluteUrl(src, url))).slice(0, 20);

    const availabilityText = cleanText(offer?.availability || '');
    let inStock = /InStock/i.test(availabilityText);
    if (!availabilityText) {
      inStock = Boolean(sourcePrice && sourcePrice > 0 && /Добави|Купи за 10 секунди/i.test(localText));
    }
    if (!sourcePrice || sourcePrice <= 0) inStock = false;

    return {
      source: 'mma.bg',
      sourceUrl: url,
      sourceProductId: sku || null,
      sku: sku || null,
      title,
      brand: brand || null,
      category: seed.category,
      description,
      currency,
      sourcePrice,
      inStock,
      status: !sourcePrice || sourcePrice <= 0 ? 'problem' : (inStock ? 'active' : 'out_of_stock'),
      sizes: uniq(sizes),
      images
    };
  }
};
