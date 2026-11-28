'use strict';
/* Drop on the web: window.drop, the same calls the app's preload gives the UI, built on fetch, localStorage and
   IndexedDB. Shopify stores answer their public JSON to any site (Access-Control-Allow-Origin: *), so Discover, store
   pages, product pages and Saved price checks work in the browser. What needs the app (reading any store page,
   background checks, orders found by themselves, the built-in browser) becomes: open the store in a new tab. */
(() => {
  const L = window.DropLib, SH = window.DropShopify, ST = L.stores, C = L.carriers, P = L.prices, O = L.orders;
  const ls = { get(k, d) { try { const v = localStorage.getItem('dropweb:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem('dropweb:' + k, JSON.stringify(v)); } catch {} } };
  const DEFAULTS = { notifyDrops: true, notifyStock: true, notifyDelivery: true, priceEveryH: 6, autoOrders: false, engine: 'google', loginItem: false, collections: [], searchStores: [], minDropPct: 1, currency: 'auto' };
  const ev = {}; const on = (ch) => (fn) => { (ev[ch] = ev[ch] || []).push(fn); return () => {}; };
  const emit = (ch, d) => (ev[ch] || []).forEach(f => { try { f(d); } catch {} });
  const saved = () => ls.get('saved', []), orders = () => ls.get('orders', []);
  const setSaved = (l) => { ls.set('saved', l.slice(0, 1000)); emit('saved', l); return l; };
  const setOrders = (l) => { ls.set('orders', l); emit('orders', l.map(O.view)); return l; };
  // the cache: IndexedDB (big product lists), memory first
  const mem = new Map(); let dbp = null;
  const db = () => dbp || (dbp = new Promise((res) => { try { const r = indexedDB.open('drop-web', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch { res(null); } }));
  const cache = {
    async get(k) { if (mem.has(k)) return mem.get(k); const d = await db(); if (!d) return null; return new Promise(res => { try { const q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => { if (q.result) mem.set(k, q.result); res(q.result || null); }; q.onerror = () => res(null); } catch { res(null); } }); },
    async set(k, v) { const e = { t: Date.now(), v }; mem.set(k, e); const d = await db(); if (!d) return; try { d.transaction('kv', 'readwrite').objectStore('kv').put(e, k); } catch {} },
  };
  // a store that refuses other sites (a redirect without CORS, a firewall) is skipped for a day
  const blocked = ls.get('blocked', {});
  const skip = new Set((window.DROP_SKIP || []).map(d => new URL(SH.baseOf(d)).hostname));
  async function fetchJSON(url, ms = 9000) {
    const host = new URL(url).hostname;
    if (skip.has(host)) return { status: 403, json: null };
    if (blocked[host] && Date.now() - blocked[host] < 864e5) return { status: 403, json: null };
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(url, { signal: ctl.signal, credentials: 'omit', headers: { Accept: 'application/json' } });
      let json = null; if (r.ok && /json/.test(r.headers.get('content-type') || '')) { try { json = await r.json(); } catch {} }
      return { status: r.status, json };
    } catch (e) {
      if (navigator.onLine && e.name !== 'AbortError') { blocked[host] = Date.now(); ls.set('blocked', blocked); }
      throw e;
    } finally { clearTimeout(tm); }
  }
  const shop = SH.createClient({ fetchJSON, cache, storeOf: (d) => ST.STORES.find(s => s.domain === d), suggest: false });
  const shopifyStore = (d) => ST.STORES.find(s => s.domain === d && s.shopify);
  const open = (u) => { if (/^https?:\/\//i.test(String(u))) window.open(String(u), '_blank', 'noopener'); };
  const today = () => new Date().toISOString().slice(0, 10);
  const favs = () => ls.get('favorites', []);

  function saveProduct(p, collection = '') {
    if (!p || !p.url || !p.name) throw new Error('Nothing to save');
    const was = saved().find(s => s.url === p.url); if (was) return was;
    const item = P.fromProduct(p, { store: p.store || '', collection });
    item.host = p.host || ''; if (p.shopify) item.shopify = p.shopify;
    setSaved([item, ...saved()]);
    return item;
  }
  async function checkPrices(ids) {
    const every = 6 * 3600e3;
    const list = saved().filter(s => s.shopify && (ids ? ids.includes(s.id) : Date.now() - (s.checked || 0) > every)).slice(0, 30);
    for (const s of list) {
      const d = ST.STORES.find(x => SH.baseOf(x.domain) === s.shopify.base);
      const p = await shop.product(d ? d.domain : new URL(s.shopify.base).hostname, s.shopify.handle).catch(() => null);
      const cur = saved().find(x => x.id === s.id); if (!cur) continue;
      const r = P.apply(cur, p ? SH.reading(p, s.shopify.variant) : null, Date.now());
      setSaved(saved().map(x => (x.id === s.id ? r.item : x)));
      for (const e of r.events) emit('toast', { msg: e.kind === 'drop' ? `${r.item.name} dropped ${e.pct}%` : `${r.item.name} is back in stock`, kind: 'ok', go: 'saved' });
    }
    return saved();
  }
  // 1.5: exchange rates, once a day from the ECB (frankfurter.dev answers any site), kept in localStorage with their date
  const CU = window.DropCurrency;
  const rates = CU.createRates({ load: () => ls.get('rates', null), save: (r) => ls.set('rates', r), fetchJSON: async (u) => { const r = await fetch(u, { credentials: 'omit' }); return r.ok ? r.json() : null; } });
  setTimeout(() => rates.refresh().then(r => { if (r) emit('rates', r); }).catch(() => {}), 50);
  const noApp = () => { throw new Error('That needs the Drop app'); };
  const nothing = async () => null;

  window.drop = {
    info: async () => ({ platform: /Mac|iPhone|iPad/.test(navigator.platform) ? 'darwin' : 'win32', arch: '', version: (window.DROP_VERSION || ''), dark: matchMedia('(prefers-color-scheme: dark)').matches, web: true, locale: navigator.language }),
    rates: async () => rates.get(),
    ready: nothing,
    stores: async () => ({ logos: window.DROP_LOGOS || [], stores: ST.STORES, categories: ST.CATEGORIES, countries: ST.COUNTRIES, engines: Object.fromEntries(Object.entries(ST.ENGINES).map(([k, v]) => [k, v.name])) }),
    fav: nothing, pimg: async (u) => (/^https?:\/\//.test(u) ? u : null),
    favorites: async () => favs(),
    favorite: async (d, on) => { const l = favs().filter(x => x !== d); ls.set('favorites', on ? [d, ...l] : l); return ls.get('favorites', []); },
    settings: async () => ({ ...DEFAULTS, ...ls.get('settings', {}) }),
    setting: async (k, v) => { if (!(k in DEFAULTS)) throw new Error('unknown setting'); if (k === 'collections') v = [...new Set((Array.isArray(v) ? v : []).map(x => String(x).trim().slice(0, 40)).filter(Boolean))]; const s = { ...DEFAULTS, ...ls.get('settings', {}), [k]: v }; ls.set('settings', s); return s; },
    openTab: async (u) => { const url = ST.anyStoreURL(u); if (!url) throw new Error('Not a web address'); open(url); return 0; },
    closeTab: nothing, activate: nothing, tabs: async () => ({ tabs: [], active: null, split: false }), nav: nothing, go: async (_id, v) => { open(ST.anyStoreURL(v) || ST.productSearchURL(v)); },
    browserRect: nothing, split: async () => false, focusPage: nothing,
    saved: async () => saved(), save: noApp, saveRecent: noApp,
    updateSaved: async (id, patch) => { const ok = {}; if (patch && 'collection' in patch) ok.collection = String(patch.collection || '').slice(0, 40); if (patch && 'notify' in patch) ok.notify = !!patch.notify; return setSaved(saved().map(s => (s.id === id ? { ...s, ...ok } : s))); },
    removeSaved: async (id) => setSaved(saved().filter(s => s.id !== id)),
    checkSaved: async (ids) => checkPrices(Array.isArray(ids) ? ids : saved().map(s => s.id)),
    recent: async () => [],
    orders: async () => orders().map(O.view),
    parse: async (s) => { const f = C.parse(s); return f ? { ...f, carrierName: C.carrierName(f.carrier) } : null; },
    carriers: async () => C.LIST.map(([id, name, region]) => ({ id, name, region })),
    track: async (input, o = {}) => { const f = C.parse(input); if (!f) throw new Error("That doesn't look like a tracking number or tracking link"); const r = O.add(orders(), { number: f.number, carrier: f.carrier, link: f.link, name: o.name || '', source: 'manual' }); setOrders(r.list); return { ...O.view(r.entry), added: r.added }; },
    trackTab: noApp,
    updateOrder: async (id, patch) => { const ok = {}; if (patch && 'name' in patch) ok.name = String(patch.name || '').slice(0, 80) || 'Order'; if (patch && 'archived' in patch) ok.archived = !!patch.archived; if (patch && 'carrier' in patch && C.CARRIERS[patch.carrier]) ok.carrier = patch.carrier;
      let l = orders(); if (patch && patch.delivered === true) l = l.map(o => (o.id === id ? O.setStatus(o, { status: 'delivered', text: 'Delivered' }).entry : o)); setOrders(l.map(o => (o.id === id ? { ...o, ...ok } : o))); return true; },
    removeOrder: async (id) => { setOrders(orders().filter(o => o.id !== id)); return true; },
    refreshOrder: async () => orders().map(O.view),
    openOrder: async (id) => { const o = orders().find(x => x.id === id); if (o) open(O.openURL(o)); return null; },
    clipboard: async () => { try { const s = String(await navigator.clipboard.readText() || '').trim().slice(0, 2000); const f = C.parse(s); return f ? { ...f, carrierName: C.carrierName(f.carrier), text: s } : null; } catch { return null; } },
    searchUrls: async (q, domains) => { const st = (domains || []).map(d => ST.STORES.find(s => s.domain === d)).filter(Boolean); return { web: ST.productSearchURL(q), engine: 'Google Shopping', stores: st.map(s => ({ domain: s.domain, name: s.name, url: ST.searchURL(s, q), own: !!s.search })) }; },
    external: async (u) => open(u), copy: async (s) => { try { await navigator.clipboard.writeText(String(s || '')); } catch {} },
    checkNow: async () => { await checkPrices(null); },
    clear: async (what) => { if (what === 'saved' || what === 'all') setSaved([]); if (what === 'orders' || what === 'all') setOrders([]); if (what === 'all') { ls.set('favorites', []); ls.set('settings', {}); } return true; },
    shopFeed: async (o = {}) => shop.feed({ domains: SH.feedOrder(ST.STORES, favs(), { cat: ST.CAT_IDS.has(o.cat) ? o.cat : '', day: today() }), cursor: Math.max(0, o.cursor | 0), want: 24, perStore: o.cat ? 6 : 4 }),
    shopStore: async (domain, page = 1) => { if (!shopifyStore(domain)) throw new Error('Not a Shopify store'); const items = await shop.products(domain, Math.max(1, page | 0), 30); return { items: items || [], more: !!(items && items.length >= 30), failed: !items }; },
    shopProduct: async (domain, handle) => (shopifyStore(domain) ? shop.product(domain, String(handle || '')) : null),
    shopSearch: async (q, domain) => { q = String(q || '').trim().slice(0, 80); if (!q) return []; if (domain) return shopifyStore(domain) ? shop.storeSearch(domain, q) : []; return shop.search(q, SH.searchOrder(ST.STORES, favs(), 8), 4); },
    shopSave: async (p, variant, collection) => { if (!p || !p.handle || !ST.STORES.some(s => s.shopify && SH.baseOf(s.domain) === p.base)) throw new Error('Not a store product'); return saveProduct(SH.toSaved(p, variant), collection || ''); },
    shopBuy: async (base, variant, qty) => { if (!ST.STORES.some(s => s.shopify && SH.baseOf(s.domain) === base)) throw new Error('Not a store'); open(SH.cartURL(base, variant, qty)); return 0; },
    updState: async () => ({ status: 'idle' }), updCheck: nothing, updInstall: nothing, updCancel: nothing, appearance: nothing,
    onTabs: on('tabs'), onSaved: on('saved'), onOrders: on('orders'), onRecent: on('recent'), onToast: on('toast'), onGoto: on('goto'), onKey: on('key'), onBusy: on('busy'), onUpdater: on('updater'), onRates: on('rates'),
  };
  // the download popup on the first visit (remembered once closed) and the Download button, top left, always there
  const MAC = 'https://github.com/mabdulhadi0208-afk/mabdulhadi0208-afk-cart/releases/latest/download/Drop-mac-arm64.dmg';
  const WIN = 'https://github.com/mabdulhadi0208-afk/mabdulhadi0208-afk-cart/releases/latest/download/Drop-win-x64.exe';
  try { if (localStorage.getItem('drop-welcomed') == null) localStorage.setItem('drop-welcomed', 'true'); } catch {} // the popup is the web welcome
  function download() {
    let d = document.getElementById('web-pop');
    if (!d) {
      d = document.createElement('div'); d.id = 'web-pop'; d.className = 'web-pop'; d.hidden = true;
      d.innerHTML = `<div class="wp-card" role="dialog" aria-modal="true" aria-labelledby="wp-t"><button class="ibtn wp-x" data-wp-close title="Close"><svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg></button>
        <div class="wp-ic"><svg viewBox="0 0 64 64"><use href="#drop-mark"/></svg></div><h2 id="wp-t">Get Drop for your computer</h2>
        <p>This is Drop on the web: shop the stores, save things and track parcels right here. The app does more: it checks prices in the background and tells you when they drop, adds your orders by itself after checkout, and opens every other store too.</p>
        <div class="wp-btns"><a class="btn btn-solid big" href="${MAC}">Download for Mac</a><a class="btn big" href="${WIN}">Download for Windows</a></div>
        <button class="btn btn-ghost wp-stay" data-wp-close>Keep shopping on the web</button><div class="wp-fine">Free. No account. Mac with Apple silicon, and Windows 10 or later.</div></div>`;
      document.body.appendChild(d);
      d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-wp-close]')) close(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !d.hidden) close(); });
    }
    d.hidden = false; requestAnimationFrame(() => d.classList.add('on'));
    function close() { d.classList.remove('on'); d.hidden = true; ls.set('popupSeen', true); }
  }
  window.dropWeb = { download };
  // the Download button, top left, goes to Drop's page on getlumen.info (what it does, and the Mac and Windows downloads)
  const btn = document.createElement('a');
  btn.id = 'web-dl'; btn.className = 'btn btn-solid small web-dl'; btn.href = '/#get-drop'; btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14"/></svg>Download';
  document.body.appendChild(btn);
  if (!ls.get('popupSeen', false)) setTimeout(download, 600);
  // Saved prices: checked when the page opens (the app checks in the background)
  setTimeout(() => { checkPrices(null).catch(() => {}); }, 4000);
})();
