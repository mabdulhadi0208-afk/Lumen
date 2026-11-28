'use strict';
// Shopify stores, natively: their public JSON (products.json, products/<handle>.json, search/suggest.json, meta.json)
// turned into Drop products, plus a small client with a cache. Pure: the network and the cache are passed in, so the
// same file runs in the main process (net fetch + files on disk), in the web version (fetch + IndexedDB) and in the
// unit tests (recorded JSON, no network).
//   product: { key, host, base, handle, id, title, vendor, type, price, compare, currency, available, image, images,
//              options: [{ name, values }], variants: [{ id, title, price, compare, available, options, image }],
//              desc, url, store, domain, cat }
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DropShopify = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const H = 3600e3;
  const TTL = { list: 6 * H, product: 1 * H, search: 2 * H, meta: 7 * 24 * H, dead: 12 * H, busy: 0.5 * H };

  // where a store lives: the same rule as stores.js homeURL (bare two-part domains get www.)
  function baseOf(domain) {
    const host = String(domain || '').split('/')[0].toLowerCase();
    const p = host.split('.'), bare = p.length === 2 || (p.length === 3 && /^(co|com|org|net|ne|or)$/.test(p[1]) && p[2].length === 2);
    return 'https://' + (bare ? 'www.' : '') + host;
  }
  const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return String(u || '').split('/')[0].replace(/^www\./, ''); } };
  const num = (v) => { if (v == null || v === '') return null; const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.]/g, '')); return Number.isFinite(n) ? n : null; };

  // a smaller picture from Shopify's image CDN (it resizes on the fly): big feeds stay light
  function img(src, w = 480) {
    let s = String(src || ''); if (!s) return '';
    if (s.startsWith('//')) s = 'https:' + s;
    if (!/^https?:\/\//.test(s)) return '';
    if (!/cdn\.shopify\.com\/|\/cdn\/shop\//.test(s) || !w) return s;
    return s.replace(/([?&])width=\d+&?/, '$1').replace(/[?&]$/, '') + (s.includes('?') ? '&' : '?') + 'width=' + w;
  }

  // product descriptions are HTML: keep the words, lose everything else (never rendered as HTML)
  const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '-', mdash: '-', rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', hellip: '...', bull: '-', middot: '-', trade: '', reg: '', copy: '' };
  function toPlain(html, max = 4000) {
    let s = String(html || '');
    s = s.replace(/<(script|style|iframe|noscript|svg|template)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<\s*br\s*\/?>/gi, '\n').replace(/<\s*li[^>]*>/gi, '\n- ').replace(/<\/\s*(p|div|h[1-6]|li|ul|ol|tr|table|section)\s*>/gi, '\n')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
        if (e[0] === '#') { const c = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return c > 31 && c < 0x2000 ? String.fromCharCode(c) : ' '; }
        const v = ENT[e.toLowerCase()]; return v == null ? ' ' : v;
      })
      // no emoji or pictographs from store copy (Drop shows plain words only)
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, '')
      .replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (s.length > max) s = s.slice(0, max).replace(/\s+\S*$/, '') + '...';
    return s;
  }
  const clean = (s, max = 160) => toPlain(s, max).replace(/\n+/g, ' ');

  const DEFAULT_TITLE = /^default( title)?$/i;
  function variantOf(v, imgById) {
    const opts = [v.option1, v.option2, v.option3].filter(x => x != null && x !== '');
    const price = num(v.price), cmp = num(v.compare_at_price);
    const im = v.featured_image ? v.featured_image.src : (v.image_id && imgById[v.image_id]) || '';
    return { id: v.id, title: DEFAULT_TITLE.test(v.title || '') ? '' : clean(v.title, 80), price, compare: cmp != null && price != null && cmp > price ? cmp : null, available: v.available !== false, options: opts.map(o => clean(o, 60)), image: im ? img(im, 960) : '' };
  }
  // one product from products.json or products/<handle>.json
  function parseProduct(p, ctx = {}) {
    if (!p || !p.handle || !p.title) return null;
    const base = ctx.base || baseOf(ctx.domain || '');
    const imgById = {}; for (const i of p.images || []) if (i && i.id) imgById[i.id] = i.src;
    const variants = (p.variants || []).slice(0, 100).map(v => variantOf(v, imgById)).filter(v => v.id);
    const avail = variants.filter(v => v.available && v.price != null);
    const pick = (avail.length ? avail : variants).reduce((a, v) => (a && a.price != null && a.price <= (v.price ?? Infinity) ? a : v), null);
    const images = (p.images || []).map(i => i && i.src).filter(Boolean).slice(0, 12).map(s => img(s, 960));
    const options = (p.options || []).filter(o => o && o.name && Array.isArray(o.values) && !(o.values.length === 1 && DEFAULT_TITLE.test(o.values[0])))
      .map(o => ({ name: clean(o.name, 40), values: o.values.slice(0, 60).map(x => clean(x, 60)) }));
    const host = hostOf(base);
    return {
      key: host + '/' + p.handle, host, base, handle: String(p.handle), id: p.id, domain: ctx.domain || host, store: ctx.store || '', cat: ctx.cat || '',
      title: clean(p.title, 160), vendor: clean(p.vendor || '', 60), type: clean(p.product_type || '', 60),
      price: pick ? pick.price : null, compare: pick ? pick.compare : null, currency: ctx.currency || '', available: avail.length > 0,
      image: images[0] || '', images, options, variants: options.length ? variants : variants.slice(0, 1),
      desc: toPlain(p.body_html || '', ctx.descMax || 4000), url: base + '/products/' + p.handle,
    };
  }
  function parseProducts(json, ctx = {}) {
    const list = json && Array.isArray(json.products) ? json.products : null;
    if (!list) return null;
    return list.map(p => parseProduct(p, ctx)).filter(Boolean);
  }
  // search/suggest.json: lighter results (no variants: the product page loads those)
  function parseSuggest(json, ctx = {}) {
    const list = json && json.resources && json.resources.results && json.resources.results.products;
    if (!Array.isArray(list)) return null;
    const base = ctx.base || baseOf(ctx.domain || ''), host = hostOf(base);
    return list.filter(p => p && p.handle && p.title).map(p => {
      const price = num(p.price_min != null ? p.price_min : p.price), cmp = num(p.compare_at_price_max);
      const im = (p.featured_image && p.featured_image.url) || p.image || '';
      return { key: host + '/' + p.handle, host, base, handle: String(p.handle), id: p.id, domain: ctx.domain || host, store: ctx.store || '', cat: ctx.cat || '',
        title: clean(p.title, 160), vendor: clean(p.vendor || '', 60), type: clean(p.type || '', 60), price, compare: cmp && price != null && cmp > price ? cmp : null,
        currency: ctx.currency || '', available: p.available !== false, image: img(im, 960), images: im ? [img(im, 960)] : [], options: [], variants: [], desc: toPlain(p.body || '', 300), url: base + '/products/' + p.handle, partial: true };
    });
  }
  // Shopify's cart permalink: the store's own cart with this item in it, one step from checkout
  function cartURL(base, variantId, qty = 1) {
    const q = Math.max(1, Math.min(99, Math.round(Number(qty) || 1)));
    if (!/^\d+$/.test(String(variantId))) return base + '/cart';
    return base.replace(/\/$/, '') + '/cart/' + variantId + ':' + q;
  }
  // a Drop product (the shape prices.js and the Saved list use) for one variant of a Shopify product
  function toSaved(p, variantId) {
    const v = (p.variants || []).find(x => String(x.id) === String(variantId)) || null;
    const price = v && v.price != null ? v.price : p.price;
    const avail = v ? v.available : p.available;
    return {
      url: p.url + (v && p.variants.length > 1 ? '?variant=' + v.id : ''), name: p.title + (v && v.title ? ' - ' + v.title : ''),
      image: (v && v.image) || p.image || '', brand: p.vendor || '', price, currency: p.currency || '', availability: avail ? 'in' : 'out',
      store: p.store || '', host: p.host, shopify: { base: p.base, handle: p.handle, variant: v ? v.id : null },
    };
  }
  // a fresh reading for a saved Shopify item from products/<handle>.json (for prices.apply)
  function reading(p, variantId) {
    if (!p) return null;
    const s = toSaved(p, variantId);
    return { price: s.price, currency: s.currency, availability: s.availability, image: s.image };
  }

  // the feed mixes stores: a few products from each, round robin, no near-duplicates (the same style in five colours)
  const family = (t) => String(t || '').toLowerCase().split(/ [-|] |, | in /)[0].replace(/[^a-z0-9 ]/g, '').trim();
  function pickFrom(items, n) {
    const out = [], seen = new Set();
    for (const p of [...items.filter(x => x.available), ...items.filter(x => !x.available)]) { if (!p.image || !(p.price > 0)) continue; const f = family(p.title); if (seen.has(f)) continue; seen.add(f); out.push(p); if (out.length >= n) break; }
    return out;
  }
  function interleave(lists) {
    const out = []; const L = lists.map(l => [...l]);
    while (L.some(l => l.length)) for (const l of L) if (l.length) out.push(l.shift());
    return out;
  }
  // search without the store's search (the web version: suggest.json does not allow other sites): match words
  function localMatch(items, q) {
    const words = String(q || '').toLowerCase().split(/\s+/).map(w => w.replace(/[^a-z0-9]/g, '')).filter(w => w.length > 1);
    if (!words.length) return [];
    const scored = [];
    for (const p of items) {
      const t = (p.title + ' ' + p.type + ' ' + p.vendor).toLowerCase();
      let s = 0; for (const w of words) { if (!t.includes(w)) { s = -1; break; } s += p.title.toLowerCase().includes(w) ? 2 : 1; }
      if (s > 0) scored.push([s, p]);
    }
    return scored.sort((a, b) => b[0] - a[0]).map(x => x[1]);
  }


  // which stores the feed walks through: followed Shopify stores first, then the best known ones (shuffled each day so
  // the feed changes), then the rest; cat narrows it to one category
  function seeded(list, seed) {
    let h = 2166136261; for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
    const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a;
  }
  function feedOrder(stores, favs = [], { cat = '', day = '', top = 120 } = {}) {
    const sh = stores.filter(s => s.shopify && (!cat || s.cat === cat));
    const fav = favs.map(d => sh.find(s => s.domain === d)).filter(Boolean);
    const rest = sh.filter(s => !favs.includes(s.domain));
    return [...fav, ...seeded(rest.slice(0, top), day + cat), ...rest.slice(top)].map(s => s.domain);
  }
  // where Search everywhere looks natively: followed Shopify stores, then well-known ones
  function searchOrder(stores, favs = [], n = 12) {
    const sh = stores.filter(s => s.shopify);
    const fav = favs.filter(d => sh.some(s => s.domain === d));
    const by = {}; for (const s of sh) (by[s.cat] = by[s.cat] || []).push(s.domain); // a spread over the categories
    return [...new Set([...fav, ...interleave(Object.values(by))])].slice(0, Math.max(n, fav.length));
  }

  // ---------------------------------------------------------------- the client
  // fetchJSON(url, ms) -> { status, json } (json null when the answer is not JSON); cache: { get(k) -> {t, v} | null, set(k, v) }
  function createClient({ fetchJSON, cache, now = () => Date.now(), storeOf = () => null, suggest = true }) {
    const inflight = new Map();
    const memo = (k, fn) => { if (inflight.has(k)) return inflight.get(k); const p = Promise.resolve().then(fn).finally(() => inflight.delete(k)); inflight.set(k, p); return p; };
    const fresh = (e, ttl) => e && e.t != null && now() - e.t < ttl;
    async function cached(key, ttl, fn) {
      const e = await cache.get(key);
      if (fresh(e, ttl)) return e.v;
      return memo(key, async () => {
        const v = await fn();
        if (v !== undefined) await cache.set(key, v);
        else if (e) return e.v; // the network failed: an older copy is better than nothing
        return v;
      });
    }
    // a store that answers 401/403/404 (closed, password page, not Shopify any more) is left alone for a while; 429 briefly
    async function isDead(domain) { const e = await cache.get('dead:' + domain); return !!(e && now() - e.t < (e.v === 429 ? TTL.busy : TTL.dead)); }
    const markDead = (domain, status) => cache.set('dead:' + domain, status || 0);
    const ctxOf = async (domain) => { const s = storeOf(domain) || {}; return { domain, base: baseOf(domain), store: s.name || hostOf(domain), cat: s.cat || '', currency: await meta(domain).then(m => m.currency).catch(() => '') }; };
    async function get(domain, path, ms = 9000) {
      if (await isDead(domain)) return null;
      let r;
      try { r = await fetchJSON(baseOf(domain) + path, ms); } catch { return undefined; }
      if (!r) return undefined;
      if (r.status === 200 && r.json) return r.json;
      if ([401, 402, 403, 404, 410, 423, 429].includes(r.status) || (r.status === 200 && !r.json)) await markDead(domain, r.status);
      return r.status >= 500 || r.status === 0 ? undefined : null;
    }
    function meta(domain) {
      return cached('meta:' + domain, TTL.meta, async () => {
        if (await isDead(domain)) return { currency: '' };
        let r; try { r = await fetchJSON(baseOf(domain) + '/meta.json', 6000); } catch { return undefined; }
        const j = r && r.status === 200 && r.json;
        return j ? { currency: /^[A-Z]{3}$/.test(j.currency || '') ? j.currency : '', name: clean(j.name || '', 60) } : (r && r.status ? { currency: '' } : undefined);
      });
    }
    async function products(domain, page = 1, limit = 30) {
      const v = await cached(`p:${domain}:${page}:${limit}`, TTL.list, async () => {
        // the products and the store's currency are asked for at the same time (one round trip, not two)
        const [j, ctx] = await Promise.all([get(domain, `/products.json?limit=${limit}&page=${page}`), ctxOf(domain)]);
        if (!j) return j === null ? null : undefined;
        const list = parseProducts(j, { ...ctx, descMax: 280 });
        return list ? list.map(slim) : null;
      });
      return v || null;
    }
    async function product(domain, handle) {
      if (!/^[\w.%-]+$/.test(String(handle))) return null;
      return (await cached(`one:${domain}:${handle}`, TTL.product, async () => {
        const [j, ctx] = await Promise.all([get(domain, `/products/${encodeURIComponent(handle)}.json`), ctxOf(domain)]);
        if (!j) return j === null ? null : undefined;
        return parseProduct(j.product, ctx);
      })) || null;
    }
    async function storeSearch(domain, q, limit = 10) {
      q = String(q || '').trim().slice(0, 80); if (!q) return [];
      if (!suggest) return localMatch(await products(domain, 1, 250) || [], q).slice(0, 40);
      return (await cached(`s:${domain}:${q.toLowerCase()}`, TTL.search, async () => {
        const j = await get(domain, `/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=${limit}`, 7000);
        if (!j) return j === null ? null : undefined;
        return parseSuggest(j, await ctxOf(domain));
      })) || [];
    }
    // the feed: domains in order (followed stores first), a cursor into that list, a few products from each store
    async function feed({ domains, cursor = 0, want = 24, perStore = 4, limit = 16, batch = 8 }) {
      const lists = []; let i = cursor, tries = 0;
      while (i < domains.length && lists.flat().length < want && tries < 4) {
        const slice = domains.slice(i, i + batch); i += slice.length; tries++;
        const got = await Promise.all(slice.map(d => products(d, 1, limit).catch(() => null)));
        for (const g of got) if (g && g.length) lists.push(pickFrom(g, perStore));
      }
      return { items: interleave(lists), cursor: i, done: i >= domains.length };
    }
    async function search(q, domains, per = 6) {
      const got = await Promise.all(domains.map(d => storeSearch(d, q, per).catch(() => [])));
      return interleave(got.map(g => (g || []).filter(p => p.image).slice(0, per)));
    }
    return { meta, products, product, storeSearch, feed, search, isDead };
  }
  // list entries keep what a card and a first look need; the product page loads the rest
  const slim = (p) => ({ ...p, images: p.images.slice(0, 6), variants: p.variants.slice(0, 60) });

  return { TTL, baseOf, img, toPlain, parseProduct, parseProducts, parseSuggest, cartURL, toSaved, reading, pickFrom, interleave, localMatch, family, feedOrder, searchOrder, seeded, createClient };
});
