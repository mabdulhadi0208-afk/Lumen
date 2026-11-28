'use strict';
/* Drop renderer. Talks to the main process only through window.drop (src/preload.js; in the web version, web/shim.js
   implements the same calls on top of fetch and local storage).
   1.3: a quiet, fast shopping app. Discover is a feed of real products from Shopify stores, each store and product
   opens natively (src/shopify.js does the reading), and only stores without a native page open in the built-in
   browser. Speed rules: screens are built once and then patched (hearts, the feed and the store grid only append),
   pictures load lazily from the stores' image CDN at the size they are shown, logos are bundled files, nothing loops
   (spinners aside). 1.6: flow hovers, lifts, glides and staggered first batches, transform and opacity only, next to the
   jelly.js press springs (calm by default). */
(() => {
  const G = window.drop;
  const SH = window.DropShopify;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const errText = (e) => String((e && e.message) || e || '').replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
  const RS = document.documentElement.style;
  const kick = (el, s = 0.5, hop = 0.3) => { if (el && window.Jelly) requestAnimationFrame(() => Jelly.kick(el, s, hop)); };
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
  const view = $('#view');

  const S = {
    info: { platform: 'darwin' }, view: 'home', stores: [], cats: [], countries: {}, engines: {}, favs: [], saved: [], orders: [], recent: [], settings: {}, logos: new Set(),
    tabs: { tabs: [], active: null, split: false }, storeQ: '', storeCat: '', storeShown: 120, storeCountry: store.get('drop-country', ''), savedCol: '', savedSort: 'recent', ordersTab: 'active',
    searchQ: '', searchStores: null, busy: false, carriers: null,
    pmap: new Map(), savedKeys: new Set(), hist: [], navOf: 'home',
    feed: { cat: '', items: [], cursor: 0, done: false, loading: false, err: false },
    st: null, pp: null, sr: new Map(),
  };
  const isMac = () => S.info.platform === 'darwin';
  const WEB = () => !!S.info.web;

  // ---------- icons (drawn on a 24px grid, stroked) ----------
  const sv = (d) => `<svg viewBox="0 0 24 24">${d}</svg>`;
  const I = {
    home: sv('<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>'),
    stores: sv('<path d="M4 9.5L5.6 4.5h12.8L20 9.5"/><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/><path d="M5.5 12v7.5h13V12"/><path d="M10 19.5v-4.5h4v4.5"/>'),
    bag: sv('<path d="M5.6 8.5h12.8l-1 11a1.6 1.6 0 0 1-1.6 1.5H8.2a1.6 1.6 0 0 1-1.6-1.5z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>'),
    heart: sv('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
    box: sv('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/><path d="M8 5.3l8 4.5"/>'),
    truck: sv('<path d="M3 6.5h11v9.5H3z"/><path d="M14 9.5h3.6L21 13v3h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>'),
    search: sv('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>'),
    sliders: sv('<path d="M5 7h9M18 7h1M5 12h2M11 12h8M5 17h7M16 17h3"/><circle cx="16" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="14" cy="17" r="2"/>'),
    back: sv('<path d="M14.5 6l-6 6 6 6"/>'), fwd: sv('<path d="M9.5 6l6 6-6 6"/>'),
    reload: sv('<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4.8h-4.8"/>'),
    x: sv('<path d="M7 7l10 10M17 7L7 17"/>'), plus: sv('<path d="M12 5v14M5 12h14"/>'), minus: sv('<path d="M5 12h14"/>'),
    split: sv('<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M12 5v14"/>'),
    ext: sv('<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>'),
    check: sv('<path d="M5 12.5l4.5 4.5L19 7.5"/>'), bell: sv('<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'),
    down: sv('<path d="M4 7l6 6 4-4 6 6"/><path d="M20 10v5h-5"/>'),
    globe: sv('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>'),
    copy: sv('<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>'),
    archive: sv('<rect x="3.5" y="4.5" width="17" height="4" rx="1.2"/><path d="M5 8.5v10a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-10"/><path d="M10 12.5h4"/>'),
    trash: sv('<path d="M4 7h16M9 7V4.8h6V7M6.5 7l1 13h9l1-13"/>'),
    spark: sv('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5"/>'),
    pin: sv('<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'),
    paste: sv('<rect x="5" y="4.5" width="14" height="16" rx="2.5"/><path d="M9 4.5V3.5h6v1"/><path d="M9 11h6M9 15h4"/>'),
    folder: sv('<path d="M3.5 7a1.5 1.5 0 0 1 1.5-1.5h4.3l2 2H19A1.5 1.5 0 0 1 20.5 9v9a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z"/>'),
    shield: sv('<path d="M12 3l7 3v5.5c0 4.4-3 8.2-7 9.5-4-1.3-7-5.1-7-9.5V6z"/><path d="M8.8 12.2l2.2 2.2 4.3-4.6"/>'),
    bolt: sv('<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>'),
    gift: sv('<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3.5 9h17v-3h-17z"/><path d="M12 6v14"/><path d="M12 6c-1.5-3-5-3-5-1s3 1 5 1c2 0 5 1 5-1s-3.5-2-5 1z"/>'),
    star: sv('<path d="M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.8 6.9 19.4l1-5.6-4.1-4 5.7-.8z"/>'),
    offline: sv('<path d="M3 9.5a14 14 0 0 1 18 0M6.5 13a9 9 0 0 1 11 0M10 16.5a4 4 0 0 1 4 0"/><path d="M4 4l16 16"/>'),
    laptop: sv('<rect x="4.5" y="5" width="15" height="10" rx="1.5"/><path d="M2.5 18.5h19"/>'),
  };
  const heart = (on) => `<svg viewBox="0 0 24 24" class="hrt${on ? ' on' : ''}"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>`;

  // ---------- appearance ----------
  const ACCENTS = [['Emerald', '#0f8a63'], ['Teal', '#0e7f8c'], ['Sapphire', '#2f55c9'], ['Amethyst', '#6a4fc4'], ['Rose', '#b8456b'], ['Copper', '#b8643a'], ['Champagne', '#a8844c'], ['Graphite', '#5c5a55']];
  S.accent = store.get('drop-accent', '#0f8a63');
  function applyAccent(c) { if (!ACCENTS.some(a => a[1] === c)) c = '#0f8a63'; S.accent = c; RS.setProperty('--accent', c); store.set('drop-accent', c); }
  applyAccent(S.accent);
  const darkMQ = matchMedia('(prefers-color-scheme: dark)');
  const paintScheme = () => document.documentElement.classList.toggle('dark', S.appearance === 'dark' || (S.appearance !== 'light' && darkMQ.matches));
  S.appearance = store.get('drop-appearance', 'system');
  darkMQ.addEventListener('change', paintScheme); paintScheme();
  function applyAppearance(m) { S.appearance = ['system', 'light', 'dark'].includes(m) ? m : 'system'; store.set('drop-appearance', S.appearance); G.appearance(S.appearance).catch(() => {}); paintScheme(); }

  // ---------- motion: Lumen's Jelly, only the press springs, calm by default ----------
  function setMotion(m) { S.motion = ['jelly', 'calm', 'off'].includes(m) ? m : 'calm'; store.set('drop-motion2', S.motion); document.body.dataset.motion = S.motion; if (window.Jelly) Jelly.setMode(S.motion); }
  setMotion(store.get('drop-motion2', 'calm'));
  if (window.Jelly) Jelly.init({ press: '.btn, .chip, .ibtn, .nav-btn, .pc-save, .seg-b, .ov, .fr, .qs, .pchip, .tg, .sw, .q-trig, .cat, .stc, .cmd-o' });

  // ---------- 1.6 motion: the flow hover follows the pointer in and out; first batches rise in a stagger ----------
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
  const still = () => S.motion === 'off' || reduceMQ.matches;
  const outMs = (ms) => (still() ? 0 : ms);
  const FLOW = '.btn, .chip, .seg-b, .nav-btn, .ibtn, .pchip, .q-trig, .backb, .tab, .cmd-o, .cur-o, .set-nav button, .sr-st, .ov, .pc-save, .pp-nav, .num, .qty button';
  const flowAt = (e) => {
    const t = e.target && e.target.closest ? e.target.closest(FLOW) : null;
    if (!t || (e.relatedTarget && t.contains(e.relatedTarget))) return;
    const r = t.getBoundingClientRect();
    t.style.setProperty('--fx', Math.round(e.clientX - r.left) + 'px'); t.style.setProperty('--fy', Math.round(e.clientY - r.top) + 'px');
  };
  document.addEventListener('pointerover', flowAt, { passive: true });
  document.addEventListener('pointerout', flowAt, { passive: true });
  let scrollT = null;
  view.addEventListener('scroll', () => { if (!scrollT) view.classList.add('scrolling'); clearTimeout(scrollT); scrollT = setTimeout(() => { scrollT = null; view.classList.remove('scrolling'); }, 160); }, { passive: true });
  const REVEAL = '.pc, .stile, .stc, .feat, .pcard, .ocard, .arr, .mini, .scard, .set-card, .sr-box, .qs';
  // only the first batch, and only what is on screen: one observer per call, gone after its first answer
  function reveal(root, sel = REVEAL) {
    if (still() || !root || !('IntersectionObserver' in window)) return;
    const els = $$(sel, root).filter(e => !e.classList.contains('rv')).slice(0, 18);
    if (!els.length) return;
    for (const e of els) e.classList.add('rv');
    const io = new IntersectionObserver((es) => {
      let i = 0;
      for (const e of es) { const t = e.target; if (e.isIntersecting) { t.style.setProperty('--i', i++); t.classList.add('in'); } else t.classList.remove('rv'); }
      io.disconnect();
    }, { root: view });
    for (const e of els) io.observe(e);
  }

  // ---------- money, dates ----------
  // 1.5: every price in the currency the person picked (src/currency.js). Converted prices carry a quiet marker and the
  // store's own price in their tooltip; with no rates yet (or "Store's own currency") the store's price shows as it is.
  const CU = window.DropCurrency;
  const wantCur = () => CU.resolve((S.settings && S.settings.currency) || 'auto', S.info.locale || navigator.language);
  const pd = (n, cur) => CU.display(n, cur, wantCur(), S.rates);
  function money(n, cur) {
    if (n == null || !Number.isFinite(Number(n))) return '';
    const d = pd(n, cur);
    return d.converted ? `<span class="cv" title="About ${esc(d.text)} at today's rate. The store charges ${esc(d.original)}.">${esc(d.text)}</span>` : esc(d.text);
  }
  const moneyText = (n, cur) => pd(n, cur).text;
  const ago = (t) => { const s = (Date.now() - t) / 1000; if (s < 60) return 'just now'; if (s < 3600) return Math.round(s / 60) + ' min ago'; if (s < 86400) return Math.round(s / 3600) + ' h ago'; const d = Math.round(s / 86400); return d === 1 ? 'yesterday' : d + ' days ago'; };
  const day = (t) => new Date(t).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };

  // ---------- store logos: bundled files for every store in the directory, the store's favicon (through main) otherwise ----------
  function hue(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 360; }
  function bundled(host) { for (let h = String(host || '').toLowerCase().replace(/^www\./, ''); h.split('.').length >= 2; h = h.split('.').slice(1).join('.')) if (S.logos.has(h)) return 'logos/' + h + '.webp'; return ''; }
  function logoHTML(host, name, cls = '') {
    host = String(host || '').split('/')[0];
    const n = String(name || host || '?').trim(), ch = (n.match(/[A-Za-z0-9]/) || ['?'])[0].toUpperCase(), h = hue(host || n);
    const src = bundled(host);
    return `<span class="logo-t ${cls}${src ? ' on' : ''}"${src ? '' : ` data-host="${esc(host)}"`}><b style="background:hsl(${h} 45% 48%)">${esc(ch)}</b>${src ? `<img alt="" src="${src}" loading="lazy" decoding="async" data-drop-img>` : '<img alt="">'}</span>`;
  }
  const favMem = new Map();
  const favIO = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { favIO.unobserve(e.target); loadFav(e.target); } }), { rootMargin: '200px' }) : null;
  function loadFav(el) {
    const host = el.dataset.host; if (!host) return;
    let p = favMem.get(host); if (!p) { p = G.fav(host).catch(() => null); favMem.set(host, p); }
    p.then(u => { if (!u) return; const img = $('img', el); img.onload = () => el.classList.add('on'); img.src = u; });
  }
  // saved product pictures come through main, which keeps them on disk; one that cannot be had shows the store's logo
  const pimgMem = new Map();
  function loadPimg(img) {
    const u = img.dataset.pimg; if (!u) return;
    if (/^data:image\//.test(u)) { img.onload = () => img.classList.add('on'); img.src = u; return; }
    let p = pimgMem.get(u); if (!p) { p = G.pimg(u).catch(() => null); pimgMem.set(u, p); }
    p.then(d => { if (!d) { img.remove(); return; } img.onload = () => img.classList.add('on'); img.src = d; });
  }
  const pimgIO = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { pimgIO.unobserve(e.target); loadPimg(e.target); } }), { rootMargin: '300px' }) : null;
  function hydrate(root) {
    for (const el of $$('.logo-t[data-host]:not([data-h])', root)) { el.dataset.h = '1'; if (favIO) favIO.observe(el); else loadFav(el); }
    for (const el of $$('img[data-pimg]:not([data-h])', root)) { el.dataset.h = '1'; if (pimgIO) pimgIO.observe(el); else loadPimg(el); }
  }

  // ---------- screens ----------
  function emptyHTML({ glyph, title, text, acts = '' }) {
    return `<div class="empty"><div class="e-orb">${glyph}</div><div class="e-title">${title}</div><div class="e-tx">${text}</div>${acts ? `<div class="e-acts">${acts}</div>` : ''}</div>`;
  }
  const pageHead = (title, sub = '', acts = '', eye = '') => `<div class="page-h"><div>${eye ? `<div class="eye">${eye}</div>` : ''}<h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${acts ? `<div class="acts">${acts}</div>` : ''}</div>`;
  let lastKey = '';
  function setView(html, key) {
    const fresh = key !== lastKey; lastKey = key;
    const keep = fresh ? 0 : view.scrollTop;
    const ae = document.activeElement, focusId = ae && ae.id && view.contains(ae) ? ae.id : '', caret = focusId && 'selectionStart' in ae ? ae.selectionStart : -1;
    view.innerHTML = `<div class="view-in${fresh ? ' fresh' : ''}">${html}</div>`;
    view.scrollTop = keep;
    hydrate(view); drawTimelines(view); if (fresh) reveal(view);
    if (focusId) { const f = document.getElementById(focusId); if (f) { f.focus(); if (caret >= 0) try { f.setSelectionRange(caret, caret); } catch {} } }
  }
  const VIEWS = ['home', 'stores', 'store', 'product', 'shop', 'search', 'saved', 'orders', 'settings'];
  const TOP = ['home', 'stores', 'shop', 'saved', 'orders', 'settings'];
  function render() {
    document.body.dataset.view = S.view;
    const navv = TOP.includes(S.view) ? S.view : S.navOf;
    for (const b of $$('.nav-btn')) b.classList.toggle('active', b.dataset.view === navv);
    ({ home: renderHome, stores: renderStores, store: renderStore, product: renderProduct, shop: renderShop, search: renderSearch, saved: renderSaved, orders: renderOrders, settings: renderSettings }[S.view] || renderHome)();
    syncBrowser();
  }
  // top-level screens reset the back stack; store and product pages push onto it
  function go(v) { if (!VIEWS.includes(v)) return; if (S.view === v && v !== 'search') return; if (TOP.includes(v)) { S.hist = []; S.navOf = v; } S.view = v; render(); }
  function push(v) { S.hist.push({ view: S.view, st: S.st, pp: S.pp, y: view.scrollTop, q: S.searchQ }); if (S.hist.length > 30) S.hist.shift(); if (TOP.includes(S.view)) S.navOf = S.view; S.view = v; }
  function back() {
    const h = S.hist.pop(); if (!h) { go(S.navOf || 'home'); return; }
    S.view = h.view; S.st = h.st; S.pp = h.pp; S.searchQ = h.q; lastKey = ''; render(); view.scrollTop = h.y;
  }
  function badges() {
    const set = (id, n) => { const b = $(id); if (!b) return; b.textContent = n > 99 ? '99+' : n; b.classList.toggle('show', n > 0); };
    set('#badge-shop', S.tabs.tabs.length); set('#badge-saved', S.saved.length);
    set('#badge-orders', S.orders.filter(o => !o.archived && o.status !== 'delivered').length);
    const foot = $('#side-foot');
    if (foot) { foot.textContent = S.busy ? 'Checking prices and parcels' : `${S.stores.length ? S.stores.length.toLocaleString() + ' stores' : 'Ready'} · ${plural(S.saved.length, 'item')} saved`; foot.classList.toggle('wait', S.busy); }
  }

  // ---------- native products (Shopify stores) ----------
  const skey = (s) => (s && s.shopify ? hostOf(s.shopify.base) + '/' + s.shopify.handle : '');
  function setSaved(list) {
    S.saved = list; S.savedKeys = new Set(list.map(skey).filter(Boolean));
    for (const b of $$('[data-psave]')) { const on = S.savedKeys.has(b.dataset.psave); b.classList.toggle('on', on); b.title = on ? 'Saved' : 'Save'; const l = $('span', b); if (l) l.textContent = on ? 'Saved' : 'Save'; }
  }
  const storeOf = (domain) => S.stores.find(s => s.domain === domain);
  const domainOfBase = (base) => { const s = S.stores.find(x => x.shopify && SH.baseOf(x.domain) === base); return s ? s.domain : hostOf(base); };
  const offPct = (p) => (p.compare && p.price ? Math.round((1 - p.price / p.compare) * 100) : 0);
  function pcHTML(p) {
    S.pmap.set(p.key, p);
    const on = S.savedKeys.has(p.key), off = offPct(p);
    return `<div class="pc"><button class="pc-open" data-pp="${esc(p.key)}" title="${esc(p.title)}"><div class="pc-img">${p.image ? `<img src="${esc(SH.img(p.image, 480))}" alt="" loading="lazy" decoding="async" data-drop-img>` : ''}<span class="ph">${p.image ? '' : I.bag}</span>${off >= 5 ? `<span class="pc-off">${off}% off</span>` : ''}${p.available ? '' : '<span class="pc-out">Sold out</span>'}</div></button>
      <button class="pc-save${on ? ' on' : ''}" data-psave="${esc(p.key)}" title="${on ? 'Saved' : 'Save'}">${I.heart}</button>
      <button class="pc-store" data-sopen="${esc(p.domain)}">${logoHTML(p.host, p.store, 'xs')}<span>${esc(p.store)}</span></button>
      <div class="pc-t">${esc(p.title)}</div><div class="pc-pr"><b${p.compare ? ' class="sale"' : ''}>${money(p.price, p.currency)}</b>${p.compare ? `<s>${money(p.compare, p.currency)}</s>` : ''}</div></div>`;
  }
  const skelHTML = (n) => Array.from({ length: n }, () => '<div class="pc skel"><div class="pc-img"></div><div class="sk"></div><div class="sk"></div></div>').join('');
  const firstVariant = (p) => (p.variants || []).find(v => v.available) || (p.variants || [])[0] || null;
  async function toggleSave(key) {
    const p = S.pmap.get(key); if (!p) return;
    const was = S.saved.find(s => skey(s) === key);
    try {
      if (was) { setSaved(await G.removeSaved(was.id)); toast('Removed from Saved'); }
      else { const v = S.pp && S.pp.p && S.pp.p.key === key ? curVariant() : firstVariant(p); const it = await G.shopSave(p, v ? v.id : null); S.savedKeys.add(key); setSaved([it, ...S.saved.filter(s => s.id !== it.id)]); toast(`Saved. Drop watches the price${WEB() ? ' each time you open it' : ''}.`, 'ok', 'saved'); }
    } catch (e) { toast(errText(e), 'bad'); }
  }

  // ---------- Discover: the feed ----------
  const FEED_CATS = [['', 'For you'], ['fashion', 'Fashion'], ['beauty', 'Beauty'], ['home', 'Home'], ['shoes', 'Shoes'], ['sport', 'Sport'], ['tech', 'Tech'], ['indie', 'Independent'], ['dept', 'Department stores'], ['jewelry', 'Jewelry'], ['grocery', 'Food and drink'], ['kids', 'Kids']];
  // 1.6: Discover is laid out like a magazine. An editorial hero (the feed's lead product), "the desk" (parcels arriving
  // and saved prices that fell, side by side), a shelf of stores, the section index, then the feed as a mosaic of large
  // and small tiles (CSS only: some tiles span two columns and two rows, so the feed still only appends).
  function homeTopHTML() {
    const arriving = S.orders.filter(o => !o.archived && o.status !== 'delivered');
    const drops = S.saved.filter(s => { const t = trend(s); return t && t.down; });
    const follows = S.favs.map(storeOf).filter(Boolean);
    let h = '';
    if (arriving.length || drops.length) {
      h += `<section class="desk${arriving.length && drops.length ? ' two' : ''}">`;
      if (arriving.length) h += `<div class="desk-col"><div class="desk-h"><span class="eye">Arriving</span><h2>${plural(arriving.length, 'parcel')} on the way</h2><span class="sp"></span><button class="lnk" data-go="orders">All orders</button></div><div class="desk-list">${arriving.slice(0, 3).map(o => { const [k, v] = etaLine(o); const host = o.host || hostOf(o.url); return `<button class="arr" data-odetail="${esc(o.id)}">${host ? logoHTML(host, o.shop, 'lg') : `<span class="logo-t glyph lg">${I.box}</span>`}<span class="a-tx"><b>${esc(o.name)}</b><span>${esc(o.shop || 'Parcel')}${o.carrierName && o.carrierName !== o.shop ? ' · ' + esc(o.carrierName) : ''}</span><i class="a-bar"><i style="transform:scaleX(${((o.step || 0) + 1) / 4})"></i></i></span><span class="a-eta"><small>${esc(k)}</small><b${v.length > 14 ? ' class="long"' : ''}>${esc(v)}</b></span></button>`; }).join('')}</div></div>`;
      if (drops.length) h += `<div class="desk-col"><div class="desk-h"><span class="eye">Price drops</span><h2>${drops.length === 1 ? 'One piece is' : drops.length + ' pieces are'} cheaper</h2><span class="sp"></span><button class="lnk" data-go="saved">All saved</button></div><div class="desk-list">${drops.slice(0, 3).map(miniSaved).join('')}</div></div>`;
      h += '</section>';
    }
    const list = (follows.length ? follows : S.stores.filter(s => s.shopify).slice(0, 14)).slice(0, 14);
    h += `<section class="shelf-sec"><div class="sec-h"><span class="eye">${follows.length ? 'Following' : 'The houses'}</span><h2>${follows.length ? 'Your stores' : 'Stores to follow'}</h2><span class="sp"></span><button class="lnk" data-go="stores">The directory</button></div><div class="stc-row">${list.map(s => `<button class="stc" data-store="${esc(s.domain)}" title="${esc(s.name)}">${logoHTML(s.domain, s.name, 'xl')}<b>${esc(s.name)}</b><span>${esc(catName(s.cat))}</span></button>`).join('')}<button class="stc add" data-go="stores"><span class="logo-t xl glyph">${I.plus}</span><b>Find more</b><span>${S.stores.length.toLocaleString()} stores</span></button></div></section>`;
    return h;
  }
  function miniSaved(it) { const tr = trend(it); return `<div class="mini" data-sopen-saved="${esc(it.id)}">${productImg(it.image, it.name, it.host || hostOf(it.url), it.store)}<div class="m-tx"><div class="m-store">${esc(it.store || hostOf(it.url))}</div><div class="m-name">${esc(it.name)}</div><div class="m-price">${money(it.price, it.currency)}${tr && tr.down ? ` <s>${money(tr.ref, it.currency)}</s>` : ''}</div></div>${tr && tr.down ? `<span class="m-pct">${tr.pct}%<small>less</small></span>` : ''}</div>`; }
  // the hero: the feed's lead product, shown large; the feed below leaves it out
  const heroPick = (items) => items.slice(0, 12).find(p => p.image && p.available) || items.find(p => p.image) || null;
  function heroHTML() {
    const F = S.feed, p = F.heroKey && S.pmap.get(F.heroKey);
    const nSh = S.stores.filter(s => s.shopify).length;
    const hi = new Date().getHours(), hello = hi < 5 ? 'Up late?' : hi < 12 ? 'Good morning.' : hi < 18 ? 'Good afternoon.' : 'Good evening.';
    const date = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    const cat = (FEED_CATS.find(c => c[0] === F.cat) || FEED_CATS[0])[1];
    const off = p ? offPct(p) : 0, on = p && S.savedKeys.has(p.key);
    return `<div class="hero-tx"><div class="eye">The Edit<span class="dot"></span>${esc(date)}</div>
        <h1>${esc(hello)}<em>${F.cat ? esc(cat) + ', hand-picked.' : 'Fresh from ' + nSh.toLocaleString() + ' stores.'}</em></h1>
        <p class="hero-lead">Real products you can buy right here, and ${(S.stores.length - nSh).toLocaleString()} more stores one click away. Save anything and Drop watches its price.</p>
        ${p ? `<div class="hero-pick"><span class="eye">Featured${off >= 5 ? ` <i class="hot">${off}% off</i>` : ''}</span><button class="hero-store" data-sopen="${esc(p.domain)}">${logoHTML(p.host, p.store, 'sm')}<span>${esc(p.store)}</span></button><b class="hero-t">${esc(p.title)}</b><div class="hero-pr">${money(p.price, p.currency)}${p.compare ? `<s>${money(p.compare, p.currency)}</s>` : ''}</div>
          <div class="hero-acts"><button class="btn btn-solid big" data-pp="${esc(p.key)}">View the piece${I.fwd}</button><button class="btn big saveb${on ? ' on' : ''}" data-psave="${esc(p.key)}">${I.heart}<span>${on ? 'Saved' : 'Save'}</span></button></div></div>` : '<div class="hero-pick sk"><i></i><i></i><i></i></div>'}</div>
      <button class="hero-img" ${p ? `data-pp="${esc(p.key)}" title="${esc(p.title)}"` : 'disabled'}>${p ? `<img src="${esc(SH.img(p.image, 1200))}" alt="" decoding="async" data-drop-img>` : ''}<span class="hero-no">No. 01</span></button>`;
  }
  function paintHero() { const el = $('#hero'); if (el) { el.innerHTML = heroHTML(); hydrate(el); } }
  function setHero(F) { const h = heroPick(F.items); F.heroKey = h ? h.key : ''; if (h) S.pmap.set(h.key, h); }
  const feedHTML = (items) => items.filter(p => p.key !== S.feed.heroKey).map(pcHTML).join('');
  function renderHome() {
    const F = S.feed;
    if (F.items.length && !F.heroKey) setHero(F);
    setView(`<section class="hero" id="hero">${heroHTML()}</section>`
      + `<div class="home-top" id="home-top">${homeTopHTML()}</div>`
      + `<div class="sec-h feed-h"><span class="eye">The feed</span><h2>Picked for you</h2><span class="sp"></span><span class="sub">${S.favs.length ? 'Stores you follow come first' : 'Follow stores to see more of them'}</span></div>`
      + `<nav class="cats" id="feed-cats">${FEED_CATS.map(([id, n]) => `<button class="cat${F.cat === id ? ' on' : ''}" data-fcat="${id}">${esc(n)}</button>`).join('')}</nav>`
      + `<div class="mosaic" id="feed">${feedHTML(F.items)}${!F.items.length && !F.done ? skelHTML(12) : ''}</div><div class="feed-more" id="feed-more"></div>`, 'home');
    paintMore();
    if (!F.items.length && !F.done) { if (!fromCache()) loadFeed(); }
    watchMore();
  }
  // 1.4: the last feed is kept (localStorage, per category) and painted at once on the next launch, so Discover is never
  // an empty skeleton when anything was seen before; a fresh first page is fetched behind it and swapped in while the
  // person is still at the top. Off in the self test, and namespaced by the fake-store base, so tests never see it.
  const feedKey = (cat, ns) => 'drop-feed2:' + (ns || '') + ':' + (cat || '');
  function fromCache() {
    const F = S.feed; if (S.info.selftest) return false;
    const c = store.get(feedKey(F.cat, S.info.ns), null);
    if (!c || !Array.isArray(c.items) || !c.items.length || Date.now() - c.t > 3 * 864e5) return false;
    F.items = c.items; F.cursor = 0; F.stale = true; setHero(F); paintHero();
    const g = $('#feed'); if (g) { g.innerHTML = feedHTML(F.items); hydrate(g); }
    revalidate(F);
    return true;
  }
  async function revalidate(F) {
    try {
      const r = await G.shopFeed({ cat: F.cat, cursor: 0 });
      if (S.feed !== F || !r.items.length) { if (S.feed === F) { F.stale = false; F.cursor = r.cursor; F.done = r.done; } return; }
      keepFeed(F.cat, r);
      const g = S.view === 'home' && $('#feed');
      const atTop = !g || view.scrollTop < 200;
      if (atTop) { F.items = r.items; setHero(F); if (g) { paintHero(); g.innerHTML = feedHTML(F.items); hydrate(g); } }
      else { const seen = new Set(F.items.map(p => p.key)); F.items.push(...r.items.filter(p => !seen.has(p.key))); }
      F.stale = false; F.cursor = r.cursor; F.done = r.done;
    } catch { F.stale = false; }
  }
  const keepFeed = (cat, r) => { if (r && r.items && r.items.length) store.set(feedKey(cat, r.ns), { t: Date.now(), items: r.items.slice(0, 32).map(p => ({ ...p, images: [], variants: [], options: [], desc: '' })) }); };
  function paintMore() {
    const m = $('#feed-more'); if (!m) return;
    const F = S.feed;
    m.innerHTML = F.loading && F.items.length ? '<i class="spin"></i>' : F.done && !F.items.length ? emptyHTML({ glyph: I.offline, title: 'The stores did not answer', text: 'Drop could not reach the stores just now. Check your connection, then try again.', acts: '<button class="btn btn-solid" data-feed-retry>Try again</button>' })
      : F.err ? '<button class="btn" data-feed-retry>Load more</button>' : F.done ? 'That is everything for now. Check back tomorrow for a fresh mix.' : '';
  }
  let moreIO = null;
  function watchMore() {
    const m = $('#feed-more'); if (!m || !('IntersectionObserver' in window)) return;
    if (moreIO) moreIO.disconnect();
    moreIO = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) loadFeed(); }, { root: view, rootMargin: '900px 0px' });
    moreIO.observe(m);
  }
  const nearEnd = () => { const m = $('#feed-more'); return m && m.getBoundingClientRect().top < view.getBoundingClientRect().bottom + 900; };
  async function loadFeed() {
    const F = S.feed; if (F.loading || F.done || F.stale) return;
    F.loading = true; F.err = false; paintMore();
    const cat = F.cat;
    try {
      const r = await G.shopFeed({ cat, cursor: F.cursor });
      if (cat !== S.feed.cat) return;
      const seen = new Set(F.items.map(p => p.key)), add = r.items.filter(p => !seen.has(p.key));
      if (!F.cursor) keepFeed(cat, r);
      F.items.push(...add); F.cursor = r.cursor; F.done = r.done;
      const first = !F.heroKey && F.items.length; if (first) setHero(F);
      const g = S.view === 'home' && $('#feed');
      if (g) { if (first) paintHero(); $$('.pc.skel', g).forEach(x => x.remove()); g.insertAdjacentHTML('beforeend', feedHTML(add)); hydrate(g); if (first) reveal(g, '.pc'); }
    } catch (e) { F.err = true; }
    finally {
      if (cat === S.feed.cat) { F.loading = false; if (S.view === 'home') { if (F.done && !F.items.length) { const g = $('#feed'); if (g) g.innerHTML = ''; } paintMore(); if (!F.done && !F.err && nearEnd()) setTimeout(loadFeed, 0); } }
    }
  }
  function setFeedCat(cat) {
    if (S.feed.cat === cat) return;
    S.feed = { cat, items: [], cursor: 0, done: false, loading: false, err: false };
    for (const b of $$('[data-fcat]')) b.classList.toggle('on', b.dataset.fcat === cat);
    paintHero(); const g = $('#feed'); if (g) g.innerHTML = skelHTML(12);
    if (!fromCache()) loadFeed();
  }

  // ---------- a native store page ----------
  function openNativeStore(domain) {
    const s = storeOf(domain);
    if (!s) { openStore(domain); return; }
    // browsing never opens a store's website: every store gets Drop's own page; only stores that share their products fill it
    push('store'); S.st = { domain, items: [], page: 0, more: !!s.shopify, loading: false, q: '', results: null, failed: false, native: !!s.shopify };
    render(); if (s.shopify) loadStore();
  }
  function renderStore() {
    const T = S.st; if (!T) { go('stores'); return; }
    const s = storeOf(T.domain) || { name: T.domain, domain: T.domain, cat: '', countries: [] };
    const fav = S.favs.includes(s.domain);
    const where = s.countries.includes('WW') ? 'Ships worldwide' : s.countries.slice(0, 3).map(c => S.countries[c] || c).join(', ');
    const list = T.results || T.items;
    const pics = T.items.filter(p => p.image).slice(0, 3);
    // 1.6: a banner like a fashion house's landing page: the logo large, the name in the display face, and three of its
    // products as a collage; then a toolbar (search the store, how many pieces) above the grid
    setView(`<nav class="crumbs"><button class="backb" data-back>${I.back}Back</button><span>/</span><button class="lnk" data-go="stores">Stores</button><span>/</span><em>${esc(s.name)}</em></nav>
      <section class="st-head${pics.length || !T.native ? ' has-col' : ''}" style="--h:${hue(s.domain)}">
        <div class="st-id">${logoHTML(s.domain, s.name, 'xxl')}
          <div class="st-tx"><div class="eye">${esc(catName(s.cat))}${where ? '<span class="dot"></span>' + esc(where) : ''}</div><h1>${esc(s.name)}</h1><p>${esc(s.domain)}${T.native ? ' · Shop right here in Drop' : ''}</p>
            <div class="acts"><button class="btn${fav ? '' : ' btn-solid'}" data-fav="${esc(s.domain)}" data-follow>${fav ? I.check + 'Following' : I.plus + 'Follow'}</button><button class="btn" data-visit="${esc(s.domain)}">${I.ext}${WEB() ? 'Visit site' : 'Visit site in Drop'}</button></div></div></div>
        ${pics.length ? `<div class="st-col n${pics.length}">${pics.map(p => `<button data-pp="${esc(p.key)}" title="${esc(p.title)}"><img src="${esc(SH.img(p.image, 600))}" alt="" decoding="async" data-drop-img></button>`).join('')}</div>` : ''}
        ${!T.native ? `<div class="st-note"><div class="eye">Shop on their site</div><h2>${esc(s.name)} does not share its products</h2><p>Drop can show products right here only for stores that publish them. Open ${esc(s.name)} to shop there${WEB() ? '' : '; Drop still reads prices and orders on its pages'}.</p><button class="btn btn-solid big" data-visit="${esc(s.domain)}">${I.ext}Open ${esc(s.name)}</button></div>` : ''}
      </section>
      <div class="st-bar"><form class="st-search" id="st-search"><label class="filt-w">${I.search}<input id="st-q" class="filt" placeholder="Search ${esc(s.name)}" value="${esc(T.q)}" autocomplete="off" spellcheck="false"></label>${T.results ? '<button type="button" class="btn btn-ghost" data-st-clear>Clear</button>' : ''}</form><span class="sp"></span><span class="st-count">${T.results ? plural(T.results.length, 'result') : T.items.length ? plural(T.items.length, 'piece') + (T.more ? ' so far' : '') : T.loading ? 'Loading the collection' : T.native ? '' : 'Search opens the store'}</span></div>
      ${T.results && !T.results.length ? emptyHTML({ glyph: I.search, title: 'Nothing by that name', text: `${esc(s.name)} has nothing matching "${esc(T.q)}". Try another word.` }) : ''}
      ${T.failed && !list.length ? emptyHTML({ glyph: I.offline, title: 'This store did not answer', text: 'It may be closed for now or busy. You can still visit its site.', acts: `<button class="btn btn-solid" data-visit="${esc(s.domain)}">${I.ext}Visit site</button>` }) : ''}
      <div class="pgrid2" id="sgrid">${list.map(pcHTML).join('')}${!list.length && T.loading ? skelHTML(12) : ''}</div>
      <div class="more-w" id="st-more">${!T.results && T.more && T.items.length ? '<button class="btn" data-st-more>Show more</button>' : ''}</div>`, 'store|' + T.domain);
  }
  async function loadStore() {
    const T = S.st; if (!T || T.loading || !T.more) return;
    T.loading = true; if (!T.items.length) renderStore(); else { const m = $('#st-more'); if (m) m.innerHTML = '<i class="spin"></i>'; }
    try {
      const r = await G.shopStore(T.domain, T.page + 1);
      if (S.st !== T) return;
      T.page++; T.more = r.more; T.failed = r.failed;
      const seen = new Set(T.items.map(p => p.key)), add = r.items.filter(p => !seen.has(p.key));
      T.items.push(...add);
      T.loading = false;
      const g = $('#sgrid');
      if (T.page === 1 || !g) renderStore(); else { g.insertAdjacentHTML('beforeend', add.map(pcHTML).join('')); hydrate(g); const m = $('#st-more'); if (m) m.innerHTML = T.more ? '<button class="btn" data-st-more>Show more</button>' : ''; }
    } catch (e) { T.loading = false; T.failed = true; if (S.view === 'store') renderStore(); }
  }

  // ---------- a native product page ----------
  async function openProduct(key, domain, handle) {
    let p = key && S.pmap.get(key);
    if (!p && domain && handle) p = { key: hostOf(SH.baseOf(domain)) + '/' + handle, domain, handle, host: hostOf(SH.baseOf(domain)), base: SH.baseOf(domain), title: '', store: (storeOf(domain) || {}).name || domain, images: [], variants: [], options: [], partial: true };
    if (!p) return;
    push('product'); S.pp = { p, sel: [], qty: 1, img: 0, loading: true, more: null };
    pickDefault(); render();
    const T = S.pp;
    const [full, more] = await Promise.all([G.shopProduct(p.domain, p.handle).catch(() => null), G.shopStore(p.domain, 1).catch(() => null)]);
    if (S.pp !== T) return;
    T.loading = false;
    if (full) { T.p = full; S.pmap.set(full.key, full); pickDefault(); }
    else if (!p.title) { T.missing = true; }
    T.more = more && more.items ? more.items.filter(x => x.key !== p.key).slice(0, 10) : [];
    if (S.view === 'product') { const y = view.scrollTop; renderProduct(); view.scrollTop = y; }
  }
  function pickDefault() { const T = S.pp, v = firstVariant(T.p); T.sel = v ? [...v.options] : (T.p.options || []).map(o => o.values[0]); }
  function curVariant() {
    const T = S.pp; if (!T) return null; const vs = T.p.variants || [];
    if (!(T.p.options || []).length) return vs[0] || null;
    return vs.find(v => v.options.every((o, i) => o === T.sel[i])) || null;
  }
  function valueOk(i, val) { const T = S.pp; return (T.p.variants || []).some(v => v.available && v.options[i] === val && v.options.every((o, j) => j === i || j > i || o === T.sel[j])); }
  function ppInfoHTML() {
    const T = S.pp, p = T.p, v = curVariant(), s = storeOf(p.domain) || { name: p.store };
    const price = v && v.price != null ? v.price : p.price, cmp = v ? v.compare : p.compare, avail = v ? v.available : p.available;
    const off = cmp && price ? Math.round((1 - price / cmp) * 100) : 0, on = S.savedKeys.has(p.key);
    const canBuy = !!(v && avail);
    return `<div class="pp-top"><button class="pp-store" data-sopen="${esc(p.domain)}">${logoHTML(p.host, s.name, 'round')}${esc(s.name || p.store)}<em>View store</em></button><button class="ibtn saveb sm${on ? ' on' : ''}" data-psave="${esc(p.key)}" title="${on ? 'Saved' : 'Save'}">${I.heart}</button></div>
      <h1>${esc(p.title || 'Loading')}</h1><div class="pp-sub">${[p.vendor && p.vendor !== s.name ? esc(p.vendor) : '', esc(p.type)].filter(Boolean).join(' · ')}</div>
      <div class="pp-price">${price != null ? `<b${cmp ? ' class="sale"' : ''}>${money(price, p.currency)}</b>` : ''}${cmp ? `<s>${money(cmp, p.currency)}</s><span class="pill off">${off}% off</span>` : ''}</div>
      ${ppCurHTML(price, p.currency, s.name || p.store)}
      ${T.loading ? '<span class="pill">Checking stock</span>' : `<span class="pill ${avail ? 'ok' : 'bad'}">${avail ? 'In stock' : v || !(p.options || []).length ? 'Sold out' : 'Not available in this combination'}</span>`}
      ${(p.options || []).map((o, i) => `<div class="opt"><div class="opt-n">${esc(o.name)}: <b>${esc(T.sel[i] || '')}</b></div><div class="opt-v">${o.values.map(val => `<button class="ov${T.sel[i] === val ? ' on' : ''}${valueOk(i, val) ? '' : ' na'}" data-ov="${i}" data-val="${esc(val)}">${esc(val)}</button>`).join('')}</div></div>`).join('')}
      <div class="pp-acts"><span class="qty"><button data-qty="-1" title="One less">${I.minus}</button><b>${T.qty}</b><button data-qty="1" title="One more">${I.plus}</button></span>
        <button class="btn btn-solid big buy" data-buy ${canBuy || T.loading ? '' : 'disabled'}>${I.bag}${canBuy || T.loading ? 'Buy at ' + esc(s.name || p.store) : 'Sold out'}</button>
        <button class="btn big saveb${on ? ' on' : ''}" data-psave="${esc(p.key)}">${I.heart}<span>${on ? 'Saved' : 'Save'}</span></button></div>
      ${pd(price, p.currency).converted ? `<div class="pp-fine strong">${esc(s.name || p.store)} charges in ${esc(CU.nameOf(p.currency || 'USD'))}: you pay ${esc(CU.format(price * T.qty, p.currency || 'USD'))} at checkout. The ${esc(CU.nameOf(wantCur()))} price is an estimate at today's rate.</div>` : ''}
      <div class="pp-fine">${WEB() ? `Buy opens ${esc(s.name || p.store)} in a new tab with this in your cart. You check out and pay on their site.` : `Buy opens ${esc(s.name || p.store)}'s checkout here in Drop with this in your cart. You pay the store directly, and the order lands in Orders.`}</div>
      <div class="pp-promise"><span>${I.shield}You pay the store directly</span><span>${I.bell}Save it and Drop watches the price</span><span>${I.truck}The order lands in Orders</span></div>`;
  }
  function ppCurHTML(price, cur, store) {
    if (price == null) return '';
    const d = pd(price, cur);
    return `<div class="pp-cur">${d.converted ? `<span>Converted from <b>${esc(d.original)}</b>, the price ${esc(store)} charges</span>` : `<span>Shown in ${esc(CU.nameOf(cur || 'USD'))}, the store's currency</span>`}<button class="lnk" data-curpick>${esc(wantCur() || 'Store currency')}<svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5"/></svg></button></div>`;
  }
  // the currency picker: searchable, from Settings and from the product page price
  async function currencyPicker() {
    const cur = (S.settings && S.settings.currency) || 'auto', auto = CU.defaultCurrency(S.info.locale || navigator.language);
    const opts = [['auto', `Match this ${WEB() ? 'device' : 'computer'}`, auto], ['store', "Store's own currency", 'As listed'], ...CU.CURRENCIES.map(([c, n]) => [c, n, c])];
    const list = (q) => opts.filter(o => !q || (o[1] + ' ' + o[2]).toLowerCase().includes(q.toLowerCase())).map(o => `<button class="cur-o${o[0] === cur ? ' on' : ''}" data-dlg-cur="${o[0]}"><span>${esc(o[1])}</span><em>${esc(o[2])}</em></button>`).join('') || '<div class="cur-none">No currency by that name</div>';
    const d = $('#dlg');
    const pick = dialog({ icon: I.globe, title: 'Currency', lead: 'Every price in Drop is shown in this currency, converted at today\'s rate. Stores still charge in their own currency.', body: `<label class="field dlg-in"><input id="cur-q" placeholder="Search currencies" autocomplete="off" spellcheck="false"></label><div class="cur-list" id="cur-list">${list('')}</div>`, buttons: [{ label: 'Done', cls: 'btn-ghost', value: null }], wide: false });
    const q = $('#cur-q'); setTimeout(() => q && q.focus(), 50);
    q.addEventListener('input', () => { $('#cur-list').innerHTML = list(q.value.trim()); });
    const onClick = (e) => { const b = e.target.closest('[data-dlg-cur]'); if (!b) return; e.stopPropagation(); d.removeEventListener('click', onClick, true); if (dlgDone) dlgDone(b.dataset.dlgCur); };
    d.addEventListener('click', onClick, true);
    const v = await pick; d.removeEventListener('click', onClick, true);
    if (!v) return;
    S.settings = await G.setting('currency', v);
    render(); toast(v === 'store' ? "Prices show in each store's own currency" : `Prices show in ${CU.nameOf(wantCur())}`);
  }
  function renderProduct() {
    const T = S.pp; if (!T) { go('home'); return; }
    const p = T.p;
    if (T.missing) { setView(`<button class="backb" data-back>${I.back}Back</button>` + emptyHTML({ glyph: I.offline, title: 'This product is not available', text: 'The store may have taken it down, or did not answer just now.', acts: `<button class="btn" data-visit="${esc(p.domain)}">Visit the store</button>` }), 'product-missing'); return; }
    const v = curVariant(), imgs = [...new Set([...(v && v.image ? [v.image] : []), ...(p.images || [])])].slice(0, 12);
    // 1.6: thumbnails in a column beside a large picture, the buy panel as a sticky card on the right, the story and
    // more from the store below
    const sName = (storeOf(p.domain) || {}).name || p.store;
    setView(`<nav class="crumbs"><button class="backb" data-back>${I.back}Back</button><span>/</span><button class="lnk" data-sopen="${esc(p.domain)}">${esc(sName)}</button><span>/</span><em>${esc(p.title || 'Product')}</em></nav>
      <div class="pp"><div class="pp-gal${imgs.length > 1 ? ' multi' : ''}">${imgs.length > 1 ? `<div class="pp-thumbs" id="pp-thumbs">${imgs.map((u, i) => `<button data-thumb="${i}"${i ? '' : ' class="on"'}><img src="${esc(SH.img(u, 160))}" alt="" loading="lazy" decoding="async" data-drop-img></button>`).join('')}</div>` : ''}
        <div class="pp-gwrap"><div class="pp-track" id="pp-track">${imgs.length ? imgs.map((u, i) => `<div class="slide"><img src="${esc(SH.img(u, 1000))}" alt="" ${i ? 'loading="lazy"' : ''} decoding="async" data-drop-img></div>`).join('') : `<div class="slide">${I.bag}</div>`}</div>
        ${imgs.length > 1 ? `<button class="pp-nav l" data-gal="-1" title="Previous picture">${I.back}</button><button class="pp-nav r" data-gal="1" title="Next picture">${I.fwd}</button><div class="pp-dots" id="pp-dots">${imgs.map((_, i) => `<i${i ? '' : ' class="on"'}></i>`).join('')}</div>` : ''}<span class="pp-count">${imgs.length > 1 ? `${imgs.length} pictures` : ''}</span></div></div>
        <div class="pp-info" id="pp-info">${ppInfoHTML()}</div></div>
      ${p.desc ? `<section class="pp-story"><div class="eye">The piece</div><h2>About this item</h2><div class="pp-desc">${esc(p.desc)}</div></section>` : ''}
      ${T.more && T.more.length ? `<section class="shelf-sec"><div class="sec-h"><span class="eye">From the same store</span><h2>More from ${esc(p.store)}</h2><span class="sp"></span><button class="lnk" data-sopen="${esc(p.domain)}">View store</button></div><div class="shelf">${T.more.map(pcHTML).join('')}</div></section>` : ''}`, 'product|' + p.key);
    const tr = $('#pp-track');
    if (tr) { let q = false; tr.addEventListener('scroll', () => { if (q) return; q = true; requestAnimationFrame(() => { q = false; const i = Math.round(tr.scrollLeft / Math.max(1, tr.clientWidth)); if (i !== T.img) { T.img = i; $$('#pp-dots i').forEach((d, k) => d.classList.toggle('on', k === i)); $$('#pp-thumbs button').forEach((d, k) => d.classList.toggle('on', k === i)); } }); }, { passive: true }); }
  }
  const paintInfo = () => { const el = $('#pp-info'); if (el) { el.innerHTML = ppInfoHTML(); hydrate(el); } };
  function galTo(i) { const tr = $('#pp-track'); if (!tr) return; const n = tr.children.length; i = (i + n) % n; tr.scrollTo({ left: i * tr.clientWidth, behavior: 'auto' }); }
  async function buy() {
    const T = S.pp; if (!T) return; const p = T.p, v = curVariant();
    try {
      if (v && v.id) { await G.shopBuy(p.base, v.id, T.qty); toast(`Checkout at ${p.store}`, 'ok'); if (!WEB()) go('shop'); }
      else await openURL(p.url);
    } catch (e) { toast(errText(e), 'bad'); }
  }

  // ---------- product cards for Saved ----------
  function spark(hist, w = 132, h = 34) {
    const pts = (hist || []).filter(x => typeof x.p === 'number');
    if (pts.length < 2) return `<svg class="spark flat" viewBox="0 0 ${w} ${h}"><path d="M3 ${h / 2}H${w - 3}"/></svg>`;
    const t0 = pts[0].t, t1 = pts[pts.length - 1].t, lo = Math.min(...pts.map(x => x.p)), hi = Math.max(...pts.map(x => x.p));
    const xy = pts.map(x => [3 + (w - 6) * ((x.t - t0) / Math.max(1, t1 - t0)), hi === lo ? h / 2 : 4 + (h - 8) * (1 - (x.p - lo) / (hi - lo))]);
    const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
    const last = xy[xy.length - 1];
    return `<svg class="spark ${pts[pts.length - 1].p < pts[0].p ? 'down' : pts[pts.length - 1].p > pts[0].p ? 'up' : 'flat'}" viewBox="0 0 ${w} ${h}"><path class="area" d="${d}L${last[0].toFixed(1)} ${h}L3 ${h}Z"/><path d="${d}"/><circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="3"/></svg>`;
  }
  function trend(it) {
    const ref = it.first != null ? it.first : (it.history && it.history[0] && it.history[0].p);
    if (it.price == null || ref == null || it.price === ref) return null;
    const pct = Math.round(Math.abs(it.price - ref) / ref * 100);
    return pct ? { down: it.price < ref, pct, ref } : null;
  }
  const AVAIL = { in: ['In stock', 'ok'], out: ['Sold out', 'bad'], pre: ['Pre-order', 'warn'] };
  function productImg(src, name, host, storeName) {
    host = String(host || '').replace(/^www\./, '');
    return `<div class="p-img">${src ? `<img alt="" data-pimg="${esc(src)}" data-drop-img>` : ''}<span class="p-ph">${host ? logoHTML(host, storeName || host, 'pl') : I.bag}</span></div>`;
  }
  function pictureFor(name) {
    const n = String(name || '').toLowerCase().trim(); if (!n) return '';
    const hit = [...S.saved, ...S.recent].find(x => x.image && x.name && (x.name.toLowerCase() === n || x.name.toLowerCase().startsWith(n) || n.startsWith(x.name.toLowerCase())));
    return hit ? hit.image : '';
  }
  function pcardHTML(it) {
    const tr = trend(it), av = AVAIL[it.availability];
    const cols = [...new Set([...(S.settings.collections || []), ...S.saved.map(s => s.collection).filter(Boolean)])];
    return `<div class="pcard${tr && tr.down ? ' dropped' : ''}" data-sid="${esc(it.id)}">
      <div class="p-img go" data-sopen-saved="${esc(it.id)}">${it.image ? `<img alt="" data-pimg="${esc(it.image)}" data-drop-img>` : ''}<span class="p-ph">${logoHTML(it.host || hostOf(it.url), it.store, 'pl')}</span></div>
      ${tr && tr.down ? `<span class="p-badge">${I.down}${tr.pct}% off</span>` : ''}${it.availability === 'out' ? '<span class="p-badge out">Sold out</span>' : ''}
      <button class="ibtn p-bell bell${it.notify === false ? '' : ' on'}" data-notify="${esc(it.id)}" title="${it.notify === false ? 'Price alerts off' : 'Price alerts on'}">${I.bell}</button>
      <div class="p-body">
        <div class="p-store">${logoHTML(it.host || hostOf(it.url), it.store, 'sm')}<span>${esc(it.store || hostOf(it.url))}</span>${it.collection ? `<em>${esc(it.collection)}</em>` : ''}</div>
        <div class="p-name" title="${esc(it.name)}">${esc(it.name)}</div>
        <div class="p-ledger"><div class="p-price"><b>${it.price != null ? money(it.price, it.currency) : 'No price yet'}</b>${tr && tr.down ? `<s>${money(tr.ref, it.currency)}</s>` : ''}</div>${spark(it.history, 120, 30)}</div>
        <div class="p-lh"><span>Low <b>${money(it.low, it.currency) || '-'}</b></span><span>High <b>${money(it.high, it.currency) || '-'}</b></span>${av ? `<span class="pill ${av[1]}">${av[0]}</span>` : ''}</div>
        <div class="p-acts"><button class="btn btn-solid small" data-sopen-saved="${esc(it.id)}">${I.bag}${it.shopify ? 'View' : 'Shop'}</button><button class="ibtn" data-check="${esc(it.id)}" title="Check the price now">${I.reload}</button>
          <label class="ibtn sel" title="Collection">${I.folder}<select data-col="${esc(it.id)}"><option value="">No collection</option>${cols.map(c => `<option${c === it.collection ? ' selected' : ''}>${esc(c)}</option>`).join('')}<option value="__new">New collection...</option></select></label>
          <span class="sp"></span><button class="ibtn" data-unsave="${esc(it.id)}" title="Remove">${I.trash}</button></div>
        <div class="p-meta">${it.checked ? 'Checked ' + ago(it.checked) : ''}${it.lastError ? ' · could not read the store last time' : ''}</div>
      </div></div>`;
  }
  function openSaved(id) {
    const it = S.saved.find(s => s.id === id); if (!it) return;
    if (it.shopify && it.shopify.handle) { openProduct('', domainOfBase(it.shopify.base), it.shopify.handle); return; }
    openURL(it.url);
  }
  function miniHTML(r) {
    const saved = S.saved.some(s => s.url === r.url);
    return `<div class="mini" data-open-url="${esc(r.url)}">${productImg(r.image, r.name, r.host || hostOf(r.url), r.store)}<div class="m-tx"><div class="m-store">${esc(r.store || hostOf(r.url))}</div><div class="m-name">${esc(r.name)}</div><div class="m-price">${money(r.price, r.currency)}</div></div>${saved ? `<span class="m-saved">${I.check}</span>` : `<button class="ibtn m-save" data-save-recent="${esc(r.url)}" title="Save and watch the price">${heart(false)}</button>`}</div>`;
  }

  // ---------- orders: cards and the timeline ----------
  const STEPS = ['Ordered', 'Shipped', 'Out for delivery', 'Delivered'];
  const STEP_IC = [I.bag, I.box, I.truck, I.check];
  function etaLine(o) {
    if (o.status === 'delivered') return ['Delivered', o.delivered ? day(o.delivered) : 'Delivered'];
    if (o.status === 'out') return ['Arriving', 'Today'];
    if (o.eta) return ['Arriving', o.eta];
    if (o.status === 'transit') return ['On the way', 'No date yet'];
    return ['Ordered', o.number ? 'Waiting for the first scan' : 'Waiting for a tracking number'];
  }
  function timelineHTML(o) {
    const step = o.step != null ? o.step : 0;
    return `<div class="tl" data-step="${step}"><div class="tl-rail"><i class="tl-fill"></i></div>${STEPS.map((s, i) => `<div class="tl-st${i < step ? ' done' : i === step ? ' now' : ''}"><span class="tl-dot">${STEP_IC[i]}</span><span class="tl-l">${s}</span></div>`).join('')}</div>`;
  }
  function drawTimelines(root) { // the fill grows on a calm spring the first time a card appears
    for (const tl of $$('.tl:not([data-drawn])', root)) {
      tl.dataset.drawn = '1';
      const fill = $('.tl-fill', tl), target = +tl.dataset.step / 3;
      if (still()) fill.style.transform = `scaleX(${target})`; else requestAnimationFrame(() => { fill.style.transform = `scaleX(${target})`; }); // 1.6: it grows on a smooth ease
    }
  }
  function ocardHTML(o, compact = false) {
    const [k, v] = etaLine(o);
    const pill = o.status === 'delivered' ? 'ok' : o.status === 'out' ? 'hot' : o.status === 'transit' ? 'go' : '';
    const host = o.host || hostOf(o.url);
    const pic = o.items && o.items[0] ? (o.items[0].image || pictureFor(o.items[0].name)) : '';
    // 1.6: a ticket. The stub on the left holds the date in the display face; the body holds the order and its timeline
    return `<div class="ocard st-${o.status}${compact ? ' compact' : ''}${o.archived ? ' arch' : ''}" data-oid="${esc(o.id)}">
      <div class="o-stub"><small>${esc(k)}</small><b${v.length > 14 ? ' class="long"' : ''}>${esc(v)}</b><span class="pill st ${pill}">${esc(o.statusText || STEPS[o.step || 0])}</span></div>
      <div class="o-main"><div class="o-head">${pic ? productImg(pic, o.name, host, o.shop) : host ? logoHTML(host, o.shop, 'lg') : `<span class="logo-t glyph lg">${I.box}</span>`}
        <div class="o-tt"><div class="o-shop">${host ? logoHTML(host, o.shop, 'xs') : ''}<span>${esc(o.shop || 'Parcel')}</span></div><div class="o-name">${esc(o.name)}</div><div class="o-sub">${o.carrierName ? esc(o.carrierName) : 'Carrier not known yet'}${o.orderNo ? ` · Order ${esc(o.orderNo)}` : ''}</div></div>
        ${o.number ? `<button class="num" data-copy="${esc(o.number)}" title="Copy the tracking number">${esc(o.number)}${I.copy}</button>` : ''}</div>
      ${timelineHTML(o)}
      ${compact ? '' : `<div class="o-acts">${o.open ? `<button class="btn btn-solid small" data-oopen="${esc(o.id)}">${I.ext}${o.number ? 'Open on carrier site' : 'Open order page'}</button>` : ''}
        ${WEB() ? '' : `<button class="btn small" data-orefresh="${esc(o.id)}">${I.reload}Refresh</button>`}<button class="btn small btn-ghost" data-odetail="${esc(o.id)}">Details</button><span class="sp"></span><span class="o-meta">${o.checked ? 'Checked ' + ago(o.checked) : 'Added ' + ago(o.added)}</span>
        <button class="ibtn" data-oarch="${esc(o.id)}" title="${o.archived ? 'Move back to active' : 'Archive'}">${I.archive}</button></div>`}</div>
    </div>`;
  }

  // ---------- Stores (the directory) ----------
  const catName = (id) => (S.cats.find(c => c[0] === id) || [, id || 'Store'])[1];
  function stileHTML(s) {
    const fav = S.favs.includes(s.domain);
    return `<div class="stile" data-store="${esc(s.domain)}">${logoHTML(s.domain, s.name, 'lg')}
      <div class="s-tx"><b>${esc(s.name)}</b><span>${esc(catName(s.cat))}</span>${s.shopify ? '<em class="tagn">Shop in Drop</em>' : ''}</div>
      <button class="ibtn fav${fav ? ' on' : ''}" data-fav="${esc(s.domain)}" title="${fav ? 'Unfollow' : 'Follow this store'}">${heart(fav)}</button></div>`;
  }
  function storeList() {
    const t = S.storeQ.toLowerCase().replace(/[^a-z0-9 .]/g, '').trim();
    let list = S.stores;
    if (S.storeCat === 'fav') list = list.filter(s => S.favs.includes(s.domain)); else if (S.storeCat === 'native') list = list.filter(s => s.shopify); else if (S.storeCat) list = list.filter(s => s.cat === S.storeCat);
    if (S.storeCountry) list = list.filter(s => s.countries.includes(S.storeCountry) || s.countries.includes('WW'));
    if (!t) return list;
    const hits = [[], [], [], []];
    for (const s of list) {
      const n = s._n || (s._n = s.name.toLowerCase().replace(/[^a-z0-9 .]/g, '')), d = s.domain;
      if (n === t || d.split('.')[0] === t) hits[0].push(s);
      else if (n.startsWith(t) || d.startsWith(t)) hits[1].push(s);
      else if (n.includes(' ' + t)) hits[2].push(s);
      else if (n.includes(t) || d.includes(t)) hits[3].push(s);
    }
    return hits.flat();
  }
  const STORE_PAGE = 120;
  function renderStores() {
    const list = storeList();
    const cc = Object.entries(S.countries).filter(([k]) => k !== 'WW').sort((a, b) => a[1].localeCompare(b[1]));
    const nSh = S.stores.filter(s => s.shopify).length;
    if (!S.catCount || S.catCount.n !== S.stores.length) { const c = { n: S.stores.length }; for (const s of S.stores) c[s.cat] = (c[s.cat] || 0) + 1; S.catCount = c; }
    // 1.6: an index with a sticky filter column on the left, like a magazine's store guide
    const catB = (id, n, count) => `<button class="chip${S.storeCat === id ? ' on' : ''}" data-cat="${id}"><span>${esc(n)}</span><em>${count != null ? count.toLocaleString() : ''}</em></button>`;
    const side = `<aside class="dir-side"><div class="eye">The directory</div><h1>Stores</h1><p>${S.stores.length.toLocaleString()} stores from every continent. ${nSh.toLocaleString()} open right here in Drop; the rest open ${WEB() ? 'on their own site' : 'in the built-in browser'}.</p>
      <label class="filt-w">${I.search}<input id="store-q" class="filt" placeholder="Find a store" value="${esc(S.storeQ)}" autocomplete="off" spellcheck="false"></label>
      <label class="selw">${I.pin}<select id="store-cc"><option value="">Every country</option>${cc.map(([k, v]) => `<option value="${k}"${k === S.storeCountry ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
      <div class="dir-cats chips">${catB('', 'All stores', S.stores.length)}${catB('native', 'Shop in Drop', nSh)}${catB('fav', 'Following', S.favs.length)}<i class="dir-rule"></i>${S.cats.map(([id, n]) => catB(id, n, S.catCount[id] || 0)).join('')}</div>
      ${WEB() ? '' : `<form class="anystore" id="anystore"><div class="as-tx"><b>Any other store</b><span>Type its address to open it in the browser.</span></div><div class="as-row"><input id="anystore-in" placeholder="store.com" autocomplete="off" spellcheck="false"><button class="btn btn-solid small">Open</button></div></form>`}</aside>`;
    const title = S.storeCat === 'fav' ? 'Following' : S.storeCat === 'native' ? 'Shop in Drop' : S.storeCat ? esc(catName(S.storeCat)) : 'All stores';
    const feat = !S.storeQ && !S.storeCat && !S.storeCountry ? S.stores.filter(s => s.shopify).slice(0, 4) : [];
    const featHTML = feat.length ? `<section class="dir-feat"><div class="sec-h"><span class="eye">Shop in Drop</span><h2>The house favourites</h2></div><div class="feat-row">${feat.map((s, i) => `<button class="feat" data-store="${esc(s.domain)}" style="--h:${hue(s.domain)}"><span class="feat-no">0${i + 1}</span>${logoHTML(s.domain, s.name, 'xl')}<b>${esc(s.name)}</b><span>${esc(catName(s.cat))}</span></button>`).join('')}</div></section>` : '';
    const body = list.length ? `<div class="sec-h"><span class="eye">${S.storeCountry ? 'Shipping to ' + esc(S.countries[S.storeCountry]) : 'The full directory'}</span><h2>${title}</h2><span class="sp"></span><span class="sub">${list.length.toLocaleString()} stores</span></div><div class="sgrid">${list.slice(0, S.storeShown).map(stileHTML).join('')}</div>${list.length > S.storeShown ? `<div class="more-w"><button class="btn" data-more-stores="1">Show more stores<span class="sub">${(list.length - S.storeShown).toLocaleString()} more</span></button></div>` : ''}`
      : emptyHTML({ glyph: I.stores, title: S.storeCat === 'fav' && !S.storeQ ? 'No stores followed yet' : 'No store by that name', text: S.storeCat === 'fav' && !S.storeQ ? 'Tap the heart on any store to follow it. Its products come first in Discover.' : WEB() ? 'Try another name.' : 'Type its address in Any other store and shop there all the same.' });
    setView(`<div class="dir">${side}<div class="dir-main">${featHTML}${body}</div></div>`, 'stores');
  }

  // ---------- the built-in browser (stores without a native page) ----------
  const activeTab = () => S.tabs.tabs.find(t => t.id === S.tabs.active);
  function renderShop() {
    setView(`<div class="browser"><div class="tabstrip" id="tabstrip"></div><div class="bbar" id="bbar"></div><div class="bview" id="bview"></div></div>`, 'shop');
    paintBrowser(true);
  }
  function tabHTML(t) {
    const host = hostOf(t.url);
    return `<div class="tab${t.id === S.tabs.active ? ' on' : ''}${S.tabs.split && t.id === S.tabs.pair ? ' pair' : ''}" data-tab="${t.id}" title="${esc(t.title)}"><span class="t-ic">${t.loading ? '<i class="spin"></i>' : t.fav ? `<img src="${esc(t.fav)}" alt="" data-drop-img>` : logoHTML(host, t.store || host, 'xs')}</span><span class="t-t">${esc(t.title)}</span>${t.product ? `<i class="t-dot" title="Product found"></i>` : ''}<button class="t-x" data-tclose="${t.id}" title="Close tab">${I.x}</button></div>`;
  }
  function paintBrowser(full = false) {
    if (S.view !== 'shop') return;
    const strip = $('#tabstrip'), bar = $('#bbar'), bv = $('#bview');
    if (!strip) return;
    strip.innerHTML = S.tabs.tabs.map(tabHTML).join('') + `<button class="ibtn newtab" data-newtab title="New tab">${I.plus}</button>`;
    hydrate(strip);
    const t = activeTab();
    const addr = $('#addr');
    const keepAddr = addr && document.activeElement === addr ? addr.value : null;
    const chips = [];
    if (t && t.product) chips.push(t.saved ? `<button class="pchip saved" data-go="saved">${I.check}Saved${t.product.price != null ? ' · ' + money(t.product.price, t.product.currency) : ''}</button>` : `<button class="pchip save" data-save-tab="${t.id}">${heart(false)}<span>Save${t.product.price != null ? ' · <b>' + money(t.product.price, t.product.currency) + '</b>' : ''}</span></button>`);
    if (t && t.tracking && t.tracking.length) chips.push(`<button class="pchip track" data-track-tab="${t.id}">${I.truck}Track ${t.tracking.length > 1 ? plural(t.tracking.length, 'parcel') : 'parcel'}</button>`);
    if (t && t.order) chips.push(`<button class="pchip order" data-go="orders">${I.box}Order${t.order.orderNo ? ' ' + esc(t.order.orderNo) : ''} saved</button>`);
    if (full || !bar.children.length) {
      bar.innerHTML = `<button class="ibtn" data-nav="back" title="Back">${I.back}</button><button class="ibtn" data-nav="fwd" title="Forward">${I.fwd}</button><button class="ibtn" data-nav="reload" title="Reload">${I.reload}</button>
        <span class="bsite" id="bsite" title="This is the store's own website, open inside Drop">${I.globe}Store website</span>
        <form class="addr" id="addr-f"><span class="lock">${I.shield}</span><input id="addr" placeholder="Search products or type a store address" autocomplete="off" spellcheck="false"></form>
        <div class="pchips" id="pchips"></div><button class="ibtn" data-split title="Side by side">${I.split}</button><button class="ibtn" data-nav="external" title="Open in your browser">${I.ext}</button>`;
    }
    $('#pchips').innerHTML = chips.join('');
    const bs = $('#bsite'); if (bs) bs.lastChild.textContent = t && t.store ? (/\/(cart|checkouts?)(\/|$)/.test(t.url) ? 'Checkout at ' + t.store : t.store + ' website') : 'Store website';
    const a = $('#addr');
    if (keepAddr == null) a.value = t ? t.url : '';
    for (const [k, on] of [['back', t && t.back], ['fwd', t && t.fwd], ['reload', !!t], ['external', !!t]]) { const b = $(`[data-nav="${k}"]`, bar); if (b) b.disabled = !on; }
    const sb = $('[data-split]', bar); if (sb) { sb.classList.toggle('on', S.tabs.split); sb.disabled = S.tabs.tabs.length < 2; }
    if (!t) {
      if (!bv.querySelector('.bempty')) {
        const quick = ['amazon.com', 'etsy.com', 'ebay.com', 'target.com', 'zara.com', 'ikea.com', 'nike.com', 'sephora.com'];
        const list = [...S.favs.filter(d => !(storeOf(d) || {}).shopify), ...quick.filter(d => !S.favs.includes(d))].slice(0, 8).map(storeOf).filter(Boolean);
        bv.innerHTML = `<div class="bempty"><div class="e-orb">${I.globe}</div><div class="e-title">The browser</div><div class="e-tx">For stores that do not open natively in Drop: their own site, with your sign-ins and carts kept. Drop still reads prices and orders here.</div><div class="qstores">${list.map(s => `<button class="qs" data-store="${esc(s.domain)}">${logoHTML(s.domain, s.name)}<span>${esc(s.name)}</span></button>`).join('')}</div></div>`;
      }
    } else if (bv.querySelector('.bempty')) bv.innerHTML = '<div class="bload"><i class="spin"></i></div>';
    syncBrowser();
  }
  let lastRect = '';
  function syncBrowser() {
    const bv = $('#bview');
    const covered = !$('#dlg').hidden || !$('#intro').hidden || !$('#sheet').hidden || !$('#cmd').hidden;
    let r = null;
    if (S.view === 'shop' && bv && !covered && activeTab()) { const b = bv.getBoundingClientRect(); r = { x: b.left, y: b.top, width: b.width, height: b.height }; }
    const k = JSON.stringify(r);
    if (k !== lastRect) { lastRect = k; G.browserRect(r).catch(() => {}); }
  }
  new ResizeObserver(() => syncBrowser()).observe(document.body);
  async function openURL(u, { background = false } = {}) {
    try { await G.openTab(u, { active: !background }); if (WEB()) return; if (!background) go('shop'); else toast('Opened in a new tab', 'info'); } catch (e) { toast(errText(e), 'bad'); }
  }
  function openStore(domain) {
    const s = storeOf(domain); const host = String(domain).split('/')[0], p = host.split('.');
    openURL('https://' + (p.length === 2 ? 'www.' : '') + domain + (s && s.domain.includes('/') ? '' : '/'));
  }

  // ---------- Search everywhere: native products first, then the web and the stores' own search pages ----------
  function defaultSearchStores() {
    const st = S.settings.searchStores && S.settings.searchStores.length ? S.settings.searchStores : ['amazon.com', 'ebay.com', 'walmart.com', 'target.com', 'etsy.com', 'bestbuy.com'];
    return st.filter(d => S.stores.some(s => s.domain === d));
  }
  async function renderSearch() {
    const q = S.searchQ.trim();
    if (!S.searchStores) S.searchStores = defaultSearchStores();
    if (!q) { setView(emptyHTML({ glyph: I.search, title: 'Search every store at once', text: 'Type what you want in the search at the top.', acts: '<button class="btn btn-solid" data-cmd>Search</button>' }), 'search-empty'); return; }
    const key = 'search|' + q + '|' + S.searchStores.join(',');
    const t = q.toLowerCase().replace(/[^a-z0-9 .]/g, '').trim();
    const stores = t.length > 1 ? S.stores.filter(s => s.name.toLowerCase().includes(t) || s.domain.startsWith(t)).slice(0, 8) : [];
    const native = S.sr.get(q.toLowerCase());
    const urls = WEB() ? null : await G.searchUrls(q, S.searchStores);
    const cards = urls ? [`<div class="scard web"><span class="sc-ic">${I.globe}</span><div class="sc-tx"><b>Every store on the web</b><span>${esc(urls.engine)}</span></div><button class="btn btn-solid" data-open-url="${esc(urls.web)}">Search${I.fwd}</button></div>`]
      .concat(urls.stores.map(s => `<div class="scard">${logoHTML(s.domain, s.name, 'lg')}<div class="sc-tx"><b>${esc(s.name)}</b><span>${s.own ? 'The store’s own search' : 'Web search limited to ' + esc(s.domain)}</span></div><button class="ibtn" data-unpick="${esc(s.domain)}" title="Remove from this search">${I.x}</button><button class="btn" data-open-url="${esc(s.url)}">Search${I.fwd}</button></div>`)) : [];
    // 1.6: products first in a wide column, the stores and the rest of the web in a column on the right
    const side = (stores.length ? `<div class="sr-box"><div class="eye">Stores</div><div class="sr-stores">${stores.map(s => `<button class="sr-st" data-store="${esc(s.domain)}">${logoHTML(s.domain, s.name, 'sm')}<span>${esc(s.name)}</span>${I.fwd}</button>`).join('')}</div></div>` : '')
      + (urls ? `<div class="sr-box"><div class="eye">Everywhere else</div><p class="sr-note">Opens in the browser; your picks are remembered.</p><div class="pick"><label class="filt-w">${I.plus}<input id="pick-in" class="filt" placeholder="Add a store to this search" autocomplete="off" spellcheck="false"></label><div class="pick-sug" id="pick-sug"></div></div><div class="scards">${cards.join('')}</div></div>` : '');
    setView(pageHead(`<em>Results for</em> ${esc(q.length > 40 ? q.slice(0, 39) + '...' : q)}`, 'Products you can buy right here come first.', urls ? `<button class="btn" data-open-all>${I.plus}Open all as tabs</button><button class="btn" data-compare>${I.split}Two side by side</button>` : '', 'Search')
      + `<div class="sr${side ? '' : ' solo'}"><div class="sr-main"><div class="sec-h"><span class="eye">Shop in Drop</span><h2>${native ? plural(native.length, 'piece') : 'Looking'}</h2><span class="sp"></span><span class="sub">From stores that open right here</span></div><div class="pgrid2" id="sr-native">${native ? native.map(pcHTML).join('') : skelHTML(6)}</div>${native && !native.length ? emptyHTML({ glyph: I.search, title: 'Nothing here yet', text: 'None of the stores Drop checked has that. Try other words, or the stores on the right.' }) : ''}</div>${side ? `<aside class="sr-side">${side}</aside>` : ''}</div>`, key);
    S.lastSearch = urls;
    if (!native) {
      const got = await G.shopSearch(q).catch(() => []);
      S.sr.set(q.toLowerCase(), got); if (S.sr.size > 30) S.sr.delete(S.sr.keys().next().value);
      if (S.view === 'search' && S.searchQ.trim() === q) { const y = view.scrollTop; lastKey = ''; renderSearch().then(() => { view.scrollTop = y; }); }
    }
  }

  // ---------- Saved ----------
  function renderSaved() {
    const cols = [...new Set([...(S.settings.collections || []), ...S.saved.map(s => s.collection).filter(Boolean)])];
    let list = S.savedCol ? S.saved.filter(s => s.collection === S.savedCol) : S.saved;
    if (S.savedSort === 'drop') list = [...list].sort((a, b) => ((trend(b) && trend(b).down ? trend(b).pct : -1) - (trend(a) && trend(a).down ? trend(a).pct : -1)));
    else if (S.savedSort === 'price') list = [...list].sort((a, b) => (a.price ?? 1e12) - (b.price ?? 1e12));
    const every = S.settings.priceEveryH === 1 ? 'every hour' : 'every ' + (S.settings.priceEveryH || 6) + ' hours';
    const drops = S.saved.filter(s => { const t = trend(s); return t && t.down; });
    const alerts = S.saved.filter(s => s.notify !== false).length;
    const top = pageHead('Saved', WEB() ? 'Prices are checked each time you open Drop. The Mac and Windows app checks them in the background and tells you when one drops.' : `Drop checks every saved price ${every} while it runs, and tells you when one drops or comes back in stock.`, S.saved.length ? `<button class="btn" data-check-all>${I.reload}Check all</button>` : '', 'Your wishlist');
    if (!S.saved.length) { setView(top + emptyHTML({ glyph: I.heart, title: 'Nothing saved yet', text: 'Tap the heart on any product. Drop keeps its price history and tells you when it drops.', acts: `<button class="btn btn-solid big" data-go="home">${I.home}Discover</button>` }), 'saved-empty'); return; }
    const stats = `<div class="stats"><div><b>${S.saved.length}</b><span>${S.saved.length === 1 ? 'piece' : 'pieces'} saved</span></div><div class="${drops.length ? 'hot' : ''}"><b>${drops.length}</b><span>cheaper now</span></div><div><b>${alerts}</b><span>price ${alerts === 1 ? 'alert' : 'alerts'} on</span></div><div><b>${cols.length}</b><span>${cols.length === 1 ? 'collection' : 'collections'}</span></div></div>`;
    const bar = `<div class="tbar"><div class="utabs">${['', ...cols].map(c => `<button class="chip${S.savedCol === c ? ' on' : ''}" data-scol="${esc(c)}">${c ? esc(c) : 'Everything'}<em>${c ? S.saved.filter(s => s.collection === c).length : S.saved.length}</em></button>`).join('')}<button class="chip add" data-newcol>${I.plus}New collection</button></div><span class="sp"></span>
      <div class="seg">${[['recent', 'Recent'], ['drop', 'Biggest drop'], ['price', 'Price']].map(([k, n]) => `<button class="seg-b${S.savedSort === k ? ' on' : ''}" data-ssort="${k}">${n}</button>`).join('')}</div></div>`;
    const rec = S.recent.length && !WEB() ? `<section class="shelf-sec"><div class="sec-h"><span class="eye">From the browser</span><h2>Recently viewed</h2><span class="sp"></span><button class="lnk" data-clear-recent>Clear</button></div><div class="minis">${S.recent.slice(0, 8).map(miniHTML).join('')}</div></section>` : '';
    setView(top + stats + bar + (list.length ? `<div class="pgrid">${list.map(pcardHTML).join('')}</div>` : emptyHTML({ glyph: I.folder, title: 'This collection is empty', text: 'Use the folder button on a saved item to move it here.' })) + rec, 'saved');
  }

  // ---------- Orders ----------
  function renderOrders() {
    const act = S.orders.filter(o => !o.archived && o.status !== 'delivered');
    const done = S.orders.filter(o => o.archived || o.status === 'delivered');
    const list = S.ordersTab === 'active' ? act : done;
    // 1.6: the list of parcels as tickets on the left, the tracking desk in a sticky column on the right
    const top = pageHead('Orders', WEB() ? 'Paste any tracking number or link: Drop finds the carrier and links you to its tracking page.' : 'Orders land here by themselves when you check out, and Drop keeps an eye on every parcel.', '', 'Parcels and deliveries');
    const side = `<aside class="ord-side"><form class="track-box" id="track-f"><div class="eye">Track a parcel</div><h3>Any carrier, any number</h3><div class="tk-in"><span id="track-ic">${I.box}</span><input id="track-in" placeholder="Paste a tracking number or link" autocomplete="off" spellcheck="false" value="${esc(S.trackVal || '')}"></div><span class="tk-det" id="track-det"></span><div class="tk-acts"><button type="button" class="btn btn-ghost small" data-paste>${I.paste}Paste</button><span class="sp"></span><button class="btn btn-solid small">Track${I.fwd}</button></div><p class="tk-fine">${WEB() ? 'UPS, FedEx, USPS, DHL, Royal Mail and 400 more carriers.' : 'UPS, FedEx, USPS, DHL, Royal Mail and 400 more. Orders from checkouts in Drop add themselves.'}</p></form>
      <div class="ord-sum"><div><b>${act.length}</b><span>on the way</span></div><div><b>${act.filter(o => o.status === 'out').length}</b><span>arriving today</span></div><div><b>${done.length}</b><span>delivered</span></div></div></aside>`;
    const tabs = `<div class="tbar"><div class="seg"><button class="seg-b${S.ordersTab === 'active' ? ' on' : ''}" data-otab="active">On the way<em>${act.length}</em></button><button class="seg-b${S.ordersTab === 'done' ? ' on' : ''}" data-otab="done">Delivered and archived<em>${done.length}</em></button></div><span class="sp"></span>${act.length && !WEB() ? `<button class="btn small" data-orefresh="">${I.reload}Refresh all</button>` : ''}</div>`;
    const body = list.length ? `<div class="olist">${list.map(o => ocardHTML(o)).join('')}</div>`
      : S.ordersTab === 'active' ? emptyHTML({ glyph: I.truck, title: 'Nothing on the way', text: 'Paste a tracking number on the right. UPS, FedEx, USPS, DHL, Royal Mail, Canada Post, Australia Post and 400 more carriers.' })
      : emptyHTML({ glyph: I.archive, title: 'No delivered parcels yet', text: 'Delivered parcels move here by themselves a few days after they arrive.' });
    setView(top + `<div class="ord"><div class="ord-main">${tabs + body}</div>${side}</div>`, 'orders|' + S.ordersTab);
    if (S.trackVal) detectInto($('#track-in'), $('#track-det'));
  }

  // ---------- Settings ----------
  function tg(k, on) { return `<button class="tg${on ? ' on' : ''}" data-set="${k}" role="switch" aria-checked="${!!on}"><i></i></button>`; }
  function renderSettings() {
    const st = S.settings, web = WEB();
    const html = `
      ${web ? '' : `<div class="set-card"><h3>Notifications</h3>
        <div class="set"><div><b>Price drops</b><span>When a saved item gets cheaper.</span></div>${tg('notifyDrops', st.notifyDrops)}</div>
        <div class="set"><div><b>Back in stock</b><span>When a sold-out item you saved is available again.</span></div>${tg('notifyStock', st.notifyStock)}</div>
        <div class="set"><div><b>Delivery updates</b><span>When a parcel ships, goes out for delivery or arrives.</span></div>${tg('notifyDelivery', st.notifyDelivery)}</div></div>
      <div class="set-card"><h3>Checking</h3>
        <div class="set"><div><b>Check saved prices</b><span>Only while Drop is open. Parcels are checked every two hours.</span></div><div class="seg">${[1, 3, 6, 12, 24].map(h => `<button class="seg-b${st.priceEveryH === h ? ' on' : ''}" data-every="${h}">${h === 24 ? 'Daily' : h + 'h'}</button>`).join('')}</div></div>
        <div class="set"><div><b>Find orders by themselves</b><span>After checkout, Drop reads the confirmation page and adds the order and its tracking.</span></div>${tg('autoOrders', st.autoOrders)}</div>
        <div class="set"><div><b>Check everything now</b><span id="busy-line">${S.busy ? 'Checking now' : 'Prices and parcels, right away.'}</span></div><button class="btn" data-check-now>${I.reload}Check now</button></div></div>
      <div class="set-card"><h3>Search</h3>
        <div class="set"><div><b>Web search</b><span>Used by Search everywhere and the address bar.</span></div><div class="seg">${Object.entries(S.engines).map(([k, n]) => `<button class="seg-b${st.engine === k ? ' on' : ''}" data-engine="${k}">${esc(n)}</button>`).join('')}</div></div></div>`}
      <div class="set-card"><h3>Prices</h3>
        <div class="set"><div><b>Currency</b><span>${S.rates ? `Every price is converted at the European Central Bank's rate of ${esc(S.rates.date)}. Stores still charge in their own currency.` : "Exchange rates have not arrived yet, so prices show in each store's own currency."}</span></div><button class="btn" data-curpick>${esc((S.settings.currency || 'auto') === 'store' ? "Store's own" : CU.nameOf(wantCur()) + ' (' + wantCur() + ')')}</button></div></div>
      <div class="set-card"><h3>Appearance</h3>
        <div class="set col"><div><b>Theme</b><span>Light, dark, or follow your ${web ? 'device' : 'computer'}.</span></div><div class="themes">${[['system', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([k, n]) => `<button class="theme t-${k}${S.appearance === k ? ' on' : ''}" data-appear="${k}"><span class="tp"><i></i><i></i><i></i></span><b>${n}</b></button>`).join('')}</div></div>
        <div class="set"><div><b>Accent</b><span>Tints the small highlights: the selected screen, switches, stock and price drops.</span></div><div class="swatches">${ACCENTS.map(([n, c]) => `<button class="sw${S.accent === c ? ' on' : ''}" data-accent="${c}" title="${n}" style="--c:${c}"></button>`).join('')}</div></div>
        <div class="set"><div><b>Motion</b><span>Colour that flows into buttons, cards that lift and screens that glide, with a small spring when you press. Jelly is livelier; Off keeps everything still.</span></div><div class="seg">${[['calm', 'Calm'], ['jelly', 'Jelly'], ['off', 'Off']].map(([k, n]) => `<button class="seg-b${S.motion === k ? ' on' : ''}" data-motion="${k}">${n}</button>`).join('')}</div></div></div>
      ${web ? '' : `<div class="set-card"><h3>General</h3>
        <div class="set"><div><b>Open at login</b><span>Drop starts quietly so prices and parcels stay fresh.</span></div>${tg('loginItem', st.loginItem)}</div></div>`}
      <div class="set-card"><h3>Your data</h3>
        <div class="set"><div><b>Saved items</b><span>${plural(S.saved.length, 'item')} and their price history.</span></div><button class="btn btn-ghost" data-clear="saved">${I.trash}Clear</button></div>
        <div class="set"><div><b>Orders</b><span>${plural(S.orders.length, 'order')} and parcels.</span></div><button class="btn btn-ghost" data-clear="orders">${I.trash}Clear</button></div>
        ${web ? '' : `<div class="set"><div><b>Recently viewed</b><span>Products you looked at.</span></div><button class="btn btn-ghost" data-clear="recent">${I.trash}Clear</button></div>
        <div class="set"><div><b>Store sign-ins and carts</b><span>Signs you out of every store and empties their carts.</span></div><button class="btn btn-ghost" data-clear="site">${I.trash}Clear</button></div>`}
        <div class="set"><div><b>Everything</b><span>Back to a fresh Drop.</span></div><button class="btn btn-warn" data-clear="all">${I.trash}Clear everything</button></div></div>
      <div class="set-card"><h3>About</h3>
        ${web ? `<div class="set"><div><b>Drop on the web</b><span>The Mac and Windows app also checks prices in the background, finds your orders by itself and opens every other store.</span></div><button class="btn btn-solid" data-web-dl>Get the app</button></div>` : `<div class="set"><div><b>Drop ${esc(S.info.version || '')}</b><span id="upd-line">Updates download in the background and install when you restart.</span></div><button class="btn" data-upd-check>${I.reload}Check for updates</button></div>`}
        <div class="set"><div><b>What's new</b><span>See what changed in Drop ${esc(WHATS_NEW.version)}.</span></div><button class="btn" data-whatsnew>${I.spark}What's new</button></div>
        <div class="set"><div><b>Welcome tour</b><span>The quick tour from your first visit.</span></div><button class="btn" data-welcome>${I.gift}Play again</button></div>
        <div class="set"><div><b>Privacy</b><span>No account, no tracking, no servers. Drop only talks to the stores and carriers you open${web ? '' : ', plus GitHub to check for updates'}, and fetches the day's exchange rates once.</span></div></div></div>`;
    // 1.6: a sticky index of the sections on the left, the cards on the right
    const secs = [];
    const cards = html.replace(/<div class="set-card"><h3>([^<]+)<\/h3>/g, (m, t) => { const id = 'sc-' + t.toLowerCase().replace(/[^a-z]+/g, '-'); secs.push([id, t]); return `<div class="set-card" id="${id}"><h3>${t}</h3>`; });
    setView(pageHead('Settings', web ? 'How Drop looks, and your data. Everything stays in this browser.' : 'Notifications, how often Drop checks, how it looks, and your data. Everything stays on this computer.', '', 'Preferences')
      + `<div class="setw"><nav class="set-nav">${secs.map(([id, t], i) => `<button data-setjump="${id}"><em>${String(i + 1).padStart(2, '0')}</em>${esc(t)}</button>`).join('')}</nav><div class="set-main">${cards}</div></div>`, 'settings');
  }

  // ---------- sheets (order details) ----------
  let sheetTok = 0;
  async function openOrderSheet(id) {
    const o = S.orders.find(x => x.id === id); if (!o) return;
    if (!S.carriers) S.carriers = await G.carriers().catch(() => []);
    const sh = $('#sheet'), back = $('#sheet-back'); sheetTok++;
    const groups = {}; for (const c of S.carriers) (groups[c.region] = groups[c.region] || []).push(c);
    const [k, v] = etaLine(o);
    sh.innerHTML = `<div class="sh-hero"><button class="ibtn sh-close" data-sclose>${I.x}</button><div class="sh-id">${o.host ? logoHTML(o.host, o.shop, 'xl') : `<span class="logo-t glyph xl">${I.box}</span>`}<div><div class="eye">${esc(o.shop || 'Parcel')}${o.carrierName ? ' · ' + esc(o.carrierName) : ''}</div><h3>${esc(o.name)}</h3></div></div><div class="sh-eta"><small>${esc(k)}</small><b>${esc(v)}</b><span class="pill ${o.status === 'delivered' ? 'ok' : o.status === 'out' ? 'hot' : 'go'}">${esc(o.statusText || STEPS[o.step || 0])}</span></div></div>
      <div class="sh-body">${timelineHTML(o)}
        <div class="facts">${o.number ? `<div class="fact wide"><span>Tracking number</span><span class="mono">${esc(o.number)}</span></div>` : ''}${o.orderNo ? `<div class="fact"><span>Order</span><span>${esc(o.orderNo)}</span></div>` : ''}<div class="fact"><span>Added</span><span>${day(o.added)}</span></div>${o.checked ? `<div class="fact"><span>Last checked</span><span>${ago(o.checked)}</span></div>` : ''}</div>
        ${o.items && o.items.length ? `<h4>In this order</h4><div class="oitems">${o.items.map(it => `<div class="oitem">${productImg(it.image || pictureFor(it.name), it.name, o.host || hostOf(o.url || ''), o.shop)}<span>${esc(it.name)}${it.qty > 1 ? ` <em>x${it.qty}</em>` : ''}</span></div>`).join('')}</div>` : ''}
        <h4>History</h4><ol class="hist">${[...(o.events || [])].reverse().map(e => `<li><i class="st-${esc(e.status)}"></i><b>${esc(e.text)}</b><span>${new Date(e.t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></li>`).join('')}</ol>
        <h4>Edit</h4><label class="field"><span>Name</span><input id="o-name" value="${esc(o.name)}" maxlength="80"></label>
        ${o.number ? `<label class="field"><span>Carrier</span><select id="o-carrier">${Object.entries(groups).map(([r, cs]) => `<optgroup label="${esc(r)}">${cs.map(c => `<option value="${c.id}"${c.id === o.carrier ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</optgroup>`).join('')}</select></label>` : ''}
        <div class="actions">${o.open ? `<button class="btn btn-solid big" data-oopen="${esc(o.id)}">${I.ext}Open</button>` : ''}${o.status !== 'delivered' ? `<button class="btn big" data-odelivered="${esc(o.id)}">${I.check}Mark delivered</button>` : ''}<button class="btn big btn-ghost" data-oarch="${esc(o.id)}">${I.archive}${o.archived ? 'Unarchive' : 'Archive'}</button><button class="btn big btn-ghost" data-oremove="${esc(o.id)}">${I.trash}Remove</button></div></div>`;
    back.hidden = false; sh.hidden = false; hydrate(sh); drawTimelines(sh);
    requestAnimationFrame(() => { back.classList.add('on'); sh.classList.add('on'); });
    syncBrowser();
    const name = $('#o-name'); name.addEventListener('change', () => G.updateOrder(id, { name: name.value }).catch(() => {}));
    const car = $('#o-carrier'); if (car) car.addEventListener('change', () => G.updateOrder(id, { carrier: car.value }).then(() => toast('Carrier changed')).catch(() => {}));
  }
  function closeSheet() {
    const sh = $('#sheet'), back = $('#sheet-back'); if (sh.hidden) return;
    sh.classList.remove('on'); back.classList.remove('on'); const tok = ++sheetTok;
    setTimeout(() => { if (tok !== sheetTok) return; sh.hidden = true; back.hidden = true; sh.innerHTML = ''; syncBrowser(); }, outMs(420));
  }

  // ---------- dialogs ----------
  let dlgDone = null, dlgTok = 0;
  function dialog({ ic = 'var(--accent)', icon = I.bag, title, lead = '', body = '', buttons = [{ label: 'OK', cls: 'btn-solid', value: true }], wide = false, input = null }) {
    if (dlgDone) dlgDone(null);
    const d = $('#dlg'); dlgTok++; d.classList.remove('out');
    d.innerHTML = `<div class="dlg${wide ? ' wide' : ''}" role="dialog" aria-modal="true" style="--ic:${ic}"><div class="dlg-ic">${icon}</div><h2>${title}</h2>${lead ? `<p class="lead">${lead}</p>` : ''}${body}${input ? `<label class="field dlg-in"><input id="dlg-in" placeholder="${esc(input.placeholder || '')}" value="${esc(input.value || '')}" maxlength="40"></label>` : ''}<div class="dlg-acts">${buttons.map((b, i) => `<button class="btn big ${b.cls || ''}" data-dlg="${i}">${b.label}</button>`).join('')}</div></div>`;
    d.hidden = false; syncBrowser();
    setTimeout(() => { const f = $('#dlg-in') || $('.dlg-acts .btn:last-child', d); if (f) f.focus(); }, 40);
    return new Promise((resolve) => {
      dlgDone = (v) => { dlgDone = null; const tk = ++dlgTok; d.classList.add('out'); resolve(v); setTimeout(() => { if (tk !== dlgTok) return; d.hidden = true; d.innerHTML = ''; d.classList.remove('out'); syncBrowser(); }, outMs(200)); };
      d.onclick = (e) => { if (!dlgDone) return; const b = e.target.closest('[data-dlg]'); if (b) { const v = buttons[+b.dataset.dlg].value; dlgDone(v === 'input' ? ($('#dlg-in').value || '').trim() : v); } else if (e.target === d) dlgDone(null); };
      d.onkeydown = (e) => { if (!dlgDone) return; if (e.key === 'Enter' && input) { e.preventDefault(); dlgDone(($('#dlg-in').value || '').trim()); } if (e.key === 'Escape') dlgDone(null); };
    });
  }
  async function newCollection() {
    const name = await dialog({ ic: '#e5487d', icon: I.folder, title: 'New collection', lead: 'Group saved items: gifts, the kitchen, someday.', input: { placeholder: 'Birthday ideas' }, buttons: [{ label: 'Cancel', cls: 'btn-ghost', value: null }, { label: 'Create', cls: 'btn-solid', value: 'input' }] });
    if (!name) return '';
    S.settings = await G.setting('collections', [...(S.settings.collections || []), name]);
    return name;
  }

  // ---------- the intro: a simple first-run welcome and What's new, one overlay ----------
  // WHATS_NEW holds ONLY this version's changes. Rewrite it with every release.
  const WHATS_NEW = { version: '1.6', lead: 'A whole new Drop.', sub: 'Every screen was rebuilt from the ground up, and every price now shows in your currency.', items: [
    ['#0f8a63', I.home, 'Discover, like a magazine', 'A featured piece up top, your parcels and price drops side by side, a shelf of stores and a feed of large and small tiles.'],
    ['#a8844c', I.search, 'A new way around', 'Sections across the top, and one search for products, stores and tracking numbers that opens with Cmd K (Ctrl K on Windows).'],
    ['#2f55c9', I.stores, 'Stores and products, redrawn', 'Store pages open on a banner with their pieces, products get a large gallery and a buy panel that stays in view.'],
    ['#b8456b', I.truck, 'Saved and Orders, reorganised', 'Your wishlist at a glance with price charts on every piece, and parcels as tickets with a tracking desk beside them.'],
    ['#6a4fc4', I.spark, 'Everything moves', 'Buttons fill with colour from where your pointer comes in, cards lift, pictures lean in, and every screen, panel and dialog glides in. Settings, Motion turns it down.'],
    ['#5c5a55', I.globe, 'Every price in your currency', 'Pick a currency in Settings or from any price. Drops are still measured in the store\'s own currency, so a moving rate never looks like a sale.'],
  ] };
  function intro(kind = 'welcome') {
    const el = $('#intro');
    const wn = kind === 'whatsnew';
    const items = wn ? WHATS_NEW.items : [
      ['#14b884', I.home, 'Discover', 'Real products from hundreds of stores, ready to buy right here.'],
      ['#e5487d', I.heart, 'Prices that fall', 'Save anything with a price. Drop watches it and tells you when it drops.'],
      ['#7c5cff', I.truck, 'Parcels that arrive', `${WEB() ? 'Paste any tracking number and Drop finds the carrier.' : 'Orders find their way in by themselves. Paste any tracking number too.'}`],
    ];
    el.innerHTML = `<div class="in-stage">
        <div class="in-side"><div class="in-bag"><svg viewBox="0 0 64 64"><use href="#drop-mark"/></svg></div>
          <div class="in-eye">${wn ? `What's new in Drop ${esc(WHATS_NEW.version)}` : 'Welcome to Drop'}</div>
          <h1 class="in-title">${wn ? esc(WHATS_NEW.lead) : 'Every store. Every parcel.'}</h1>
          <p class="in-lead">${wn ? esc(WHATS_NEW.sub) : 'Shop hundreds of stores in one place, save anything and watch its price, and track every parcel.'}</p>
          <div class="in-fine">${wn ? `Version ${esc(WHATS_NEW.version)}. Every feature you had is still here, in a new place.` : `No account. Nothing leaves this ${WEB() ? 'browser' : 'computer'} except what you open.`}</div></div>
        <div class="in-main"><div class="in-cards">${items.map(([c, ic, t, d], i) => `<div class="in-card" style="--c:${c};--i:${i}"><em>${String(i + 1).padStart(2, '0')}</em><div><b>${t}</b><p>${d}</p></div><span>${ic}</span></div>`).join('')}</div>
          <button class="btn btn-solid big in-go" data-intro-done>${wn ? "Let's go" : 'Start shopping'}${I.fwd}</button></div>
      </div>`;
    el.hidden = false; el.className = 'intro ' + kind; syncBrowser();
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('play')));
    setTimeout(() => kick($('.in-bag', el), 0.6, 0.4), S.motion === 'off' ? 0 : 260);
    return new Promise(res => { el.onclick = (e) => { if (e.target.closest('[data-intro-done]')) { el.onclick = null; el.classList.add('out'); setTimeout(() => { el.hidden = true; el.innerHTML = ''; el.className = 'intro'; syncBrowser(); res(); }, outMs(320)); } }; });
  }

  // ---------- toasts ----------
  function toast(msg, kind = 'ok', goTo = '') {
    const t = document.createElement('div');
    t.className = 'toast ' + kind;
    t.innerHTML = `<span class="t-orb">${kind === 'bad' ? I.x : kind === 'info' ? I.spark : I.check}</span><span>${esc(msg)}</span>${goTo ? `<button class="lnk" data-go="${esc(goTo)}">View</button>` : ''}`;
    const box = $('#toasts');
    box.appendChild(t); while (box.children.length > 3) box.firstElementChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), outMs(320)); }, kind === 'bad' ? 6000 : 3800);
  }

  // ---------- tracking box (Orders) ----------
  async function detectInto(input, det) {
    const v = input.value.trim();
    if (!v) { det.textContent = ''; det.className = 'tk-det'; return; }
    const f = await G.parse(v).catch(() => null);
    det.textContent = f ? f.carrierName : 'Not a tracking number yet';
    det.className = 'tk-det' + (f ? ' ok' : ' no');
  }
  async function trackInput(v) {
    v = String(v || '').trim(); if (!v) return;
    try {
      const o = await G.track(v);
      toast(o.added ? `Tracking ${o.number} with ${o.carrierName}` : 'Already tracking that one', 'ok');
      S.ordersTab = 'active'; S.view === 'orders' ? render() : go('orders');
      setTimeout(() => { const c = document.querySelector(`[data-oid="${CSS.escape(o.id)}"]`); if (c) { c.scrollIntoView({ block: 'center' }); c.classList.add('flash'); } }, 200);
      return true;
    } catch (e) { toast(errText(e), 'bad'); return false; }
  }

  // ---------- clicks ----------
  document.addEventListener('click', async (e) => {
    const t = e.target.closest('button, [data-open-url], [data-store], [data-tab], [data-oid].compact, [data-sopen-saved], .nav-btn');
    if (!t || t.closest('#dlg') || t.closest('#intro') || t.closest('#cmd')) return;
    const d = t.dataset;
    if (t.matches('.nav-btn')) { go(d.view); return; }
    if ('cmd' in d) { openCmd(); return; }
    if (d.setjump) { const el = document.getElementById(d.setjump); if (el) el.scrollIntoView({ block: 'start' }); return; }
    if (d.go) { go(d.go); return; }
    if ('back' in d) { back(); return; }
    if (d.pp) { openProduct(d.pp); return; }
    if (d.psave) { e.stopPropagation(); kick(t, 0.6, 0.3); toggleSave(d.psave); return; }
    if (d.sopen) { e.stopPropagation(); if (S.view === 'store' && S.st && S.st.domain === d.sopen) return; openNativeStore(d.sopen); return; }
    if (d.sopenSaved && !e.target.closest('.ibtn')) { openSaved(d.sopenSaved); return; }
    if (d.fcat != null) { setFeedCat(d.fcat); return; }
    if ('feedRetry' in d) { S.feed.done = false; S.feed.err = false; S.feed.cursor = S.feed.items.length ? S.feed.cursor : 0; if (!S.feed.items.length) { const g = $('#feed'); if (g) g.innerHTML = skelHTML(12); } loadFeed(); return; }
    if ('stMore' in d) { loadStore(); return; }
    if ('stClear' in d) { if (S.st) { S.st.results = null; S.st.q = ''; renderStore(); } return; }
    if (d.visit) { openStore(d.visit); return; }
    if (d.ov != null) { const T = S.pp; if (!T) return; T.sel[+d.ov] = d.val; paintInfo(); const v = curVariant(); if (v && v.image) { const i = [...new Set([v.image, ...(T.p.images || [])])].indexOf(v.image); if (i >= 0) galTo(0); } return; }
    if (d.qty) { const T = S.pp; if (!T) return; T.qty = Math.max(1, Math.min(20, T.qty + +d.qty)); paintInfo(); return; }
    if ('buy' in d) { buy(); return; }
    if (d.gal) { galTo((S.pp ? S.pp.img : 0) + +d.gal); return; }
    if (d.thumb) { galTo(+d.thumb); return; }
    if ('webDl' in d) { if (window.dropWeb) window.dropWeb.download(); return; }
    if (d.tclose) { e.stopPropagation(); G.closeTab(+d.tclose); return; }
    if (d.tab) { G.activate(+d.tab); return; }
    if ('newtab' in d) { const a = $('#addr'); if (a) { a.value = ''; a.dataset.newtab = '1'; a.focus(); } return; }
    if (d.nav) { const tb = activeTab(); if (tb) G.nav(tb.id, d.nav); return; }
    if ('split' in d) { const on = await G.split(!S.tabs.split); S.tabs.split = on; paintBrowser(); return; }
    if (d.fav) {
      e.stopPropagation(); const on = !S.favs.includes(d.fav); S.favs = await G.favorite(d.fav, on);
      if ('follow' in d) { renderStore(); toast(on ? 'Following. Its products come first in Discover.' : 'Unfollowed'); } else { t.classList.toggle('on', on); t.innerHTML = heart(on); kick(t, 0.8, 0.5); }
      S.feed = { cat: S.feed.cat, items: [], cursor: 0, done: false, loading: false, err: false }; // the feed starts again with this store in its place
      if (S.storeCat === 'fav' && S.view === 'stores') render();
      return;
    }
    if (d.store && !e.target.closest('.ibtn')) { openNativeStore(d.store); return; }
    if (d.saveTab) { try { const it = await G.save(+d.saveTab); toast(`Saved ${it.name}`, 'ok', 'saved'); } catch (err) { toast(errText(err), 'bad'); } return; }
    if (d.saveRecent) { e.stopPropagation(); try { const it = await G.saveRecent(d.saveRecent); toast(`Saved ${it.name}`, 'ok', 'saved'); } catch (err) { toast(errText(err), 'bad'); } return; }
    if (d.trackTab) { try { const o = await G.trackTab(+d.trackTab); toast(`Tracking ${o.number}`, 'ok', 'orders'); } catch (err) { toast(errText(err), 'bad'); } return; }
    if (d.openUrl && !e.target.closest('.ibtn')) { openURL(d.openUrl, { background: e.metaKey || e.ctrlKey }); return; }
    if (d.check) { t.classList.add('spinning'); await G.checkSaved([d.check]).catch(() => {}); t.classList.remove('spinning'); toast('Price checked'); return; }
    if (d.notify) { const it = S.saved.find(s => s.id === d.notify); if (it) await G.updateSaved(it.id, { notify: it.notify === false }); return; }
    if (d.unsave) { const it = S.saved.find(s => s.id === d.unsave); if (it && await dialog({ ic: '#e5487d', icon: I.trash, title: 'Remove this item?', lead: esc(it.name), buttons: [{ label: 'Keep', cls: 'btn-ghost', value: false }, { label: 'Remove', cls: 'btn-warn', value: true }] })) { setSaved(await G.removeSaved(it.id)); toast('Removed'); render(); } return; }
    if ('scol' in d) { S.savedCol = d.scol; render(); return; }
    if (d.ssort) { S.savedSort = d.ssort; render(); return; }
    if ('newcol' in d) { const n = await newCollection(); if (n) { S.savedCol = n; render(); } return; }
    if ('checkAll' in d) { t.disabled = true; toast('Checking every saved price', 'info'); await G.checkSaved(null).catch(() => {}); t.disabled = false; toast('Prices are up to date'); return; }
    if (d.cat != null && t.matches('.chip')) { S.storeCat = d.cat; S.storeShown = STORE_PAGE; render(); return; }
    if (d.moreStores) { const y = view.scrollTop; S.storeShown += STORE_PAGE * 2; render(); view.scrollTop = y; return; }
    if (d.otab) { S.ordersTab = d.otab; render(); return; }
    if (d.oopen) { closeSheet(); await G.openOrder(d.oopen); if (!WEB()) go('shop'); return; }
    if ('orefresh' in d) { t.disabled = true; t.classList.add('spinning'); await G.refreshOrder(d.orefresh || null).catch(() => {}); t.classList.remove('spinning'); t.disabled = false; toast(d.orefresh ? 'Checked with the carrier' : 'Every parcel checked'); return; }
    if (d.odetail) { openOrderSheet(d.odetail); return; }
    if (d.oarch) { const o = S.orders.find(x => x.id === d.oarch); if (o) { await G.updateOrder(o.id, { archived: !o.archived }); toast(o.archived ? 'Moved back to On the way' : 'Archived'); closeSheet(); } return; }
    if (d.odelivered) { await G.updateOrder(d.odelivered, { delivered: true }); closeSheet(); toast('Marked as delivered'); return; }
    if (d.oremove) { if (await dialog({ ic: '#7c5cff', icon: I.trash, title: 'Remove this order?', lead: 'Drop stops tracking it.', buttons: [{ label: 'Keep', cls: 'btn-ghost', value: false }, { label: 'Remove', cls: 'btn-warn', value: true }] })) { await G.removeOrder(d.oremove); closeSheet(); toast('Removed'); } return; }
    if (d.copy) { e.stopPropagation(); await G.copy(d.copy); toast('Tracking number copied'); return; }
    if (d.oid && t.matches('.compact')) { openOrderSheet(d.oid); return; }
    if ('paste' in d) { const f = await G.clipboard(); const inp = $('#track-in'); if (f && inp) { inp.value = S.trackVal = f.text; detectInto(inp, $('#track-det')); } else toast('No tracking number on the clipboard', 'info'); return; }
    if ('sclose' in d) { closeSheet(); return; }
    if ('openAll' in d && S.lastSearch) { for (const u of [S.lastSearch.web, ...S.lastSearch.stores.map(s => s.url)]) await G.openTab(u, { active: false }).catch(() => {}); await G.openTab(S.lastSearch.web, { active: true }).catch(() => {}); go('shop'); return; }
    if ('compare' in d && S.lastSearch) { const st = S.lastSearch.stores; const a = st[0] ? st[0].url : S.lastSearch.web, b = st[1] ? st[1].url : S.lastSearch.web; await G.openTab(a, { active: true }); await G.openTab(b, { active: true }); S.tabs.split = await G.split(true); go('shop'); return; }
    if (d.unpick) { S.searchStores = S.searchStores.filter(x => x !== d.unpick); G.setting('searchStores', S.searchStores).then(s => { S.settings = s; }); render(); return; }
    if (d.pick) { if (!S.searchStores.includes(d.pick)) S.searchStores = [...S.searchStores, d.pick].slice(0, 12); G.setting('searchStores', S.searchStores).then(s => { S.settings = s; }); render(); return; }
    if (d.set) { const on = !t.classList.contains('on'); t.classList.toggle('on', on); S.settings = await G.setting(d.set, on); return; }
    if (d.every) { S.settings = await G.setting('priceEveryH', +d.every); render(); return; }
    if (d.engine) { S.settings = await G.setting('engine', d.engine); render(); return; }
    if (d.appear) { applyAppearance(d.appear); render(); return; }
    if (d.accent) { applyAccent(d.accent); render(); return; }
    if (d.motion) { setMotion(d.motion); render(); return; }
    if ('checkNow' in d) { G.checkNow(); toast('Checking prices and parcels', 'info'); return; }
    if (d.clear) {
      const what = { saved: 'every saved item', orders: 'every order', recent: 'recently viewed', site: 'every store sign-in and cart', all: 'everything in Drop' }[d.clear];
      if (await dialog({ ic: '#e0445f', icon: I.trash, title: 'Clear ' + what + '?', lead: 'This cannot be undone.', buttons: [{ label: 'Cancel', cls: 'btn-ghost', value: false }, { label: 'Clear', cls: 'btn-warn', value: true }] })) { await G.clear(d.clear); if (d.clear === 'all') { S.favs = []; S.settings = await G.settings(); } toast('Cleared'); render(); }
      return;
    }
    if ('clearRecent' in d) { await G.clear('recent'); return; }
    if ('updCheck' in d) { const u = await G.updCheck().catch(() => null); if (u && u.status === 'uptodate') toast(`Drop ${S.info.version} is the newest version`); return; }
    if ('curpick' in d) { currencyPicker(); return; }
    if ('whatsnew' in d) { intro('whatsnew'); return; }
    if ('welcome' in d) { intro('welcome'); return; }
  });
  document.addEventListener('change', async (e) => {
    const t = e.target;
    if (t.id === 'store-cc') { S.storeShown = STORE_PAGE; S.storeCountry = t.value; store.set('drop-country', t.value); render(); return; }
    if (t.dataset.col) { let v = t.value; if (v === '__new') { v = await newCollection(); if (!v) { render(); return; } } await G.updateSaved(t.dataset.col, { collection: v }); toast(v ? `Moved to ${v}` : 'Removed from the collection'); }
  });
  let storeQT = null;
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'store-q') { clearTimeout(storeQT); storeQT = setTimeout(() => { S.storeQ = t.value; S.storeShown = STORE_PAGE; render(); }, 120); return; }
    if (t.id === 'track-in') { S.trackVal = t.value; detectInto(t, $('#track-det')); return; }
    if (t.id === 'pick-in') {
      const q = t.value.toLowerCase().trim(), box = $('#pick-sug');
      const hits = q ? S.stores.filter(s => !S.searchStores.includes(s.domain) && (s.name.toLowerCase().includes(q) || s.domain.includes(q))).slice(0, 6) : [];
      box.innerHTML = hits.map(s => `<button class="chip" data-pick="${esc(s.domain)}">${logoHTML(s.domain, s.name, 'xs')}${esc(s.name)}</button>`).join(''); hydrate(box);
    }
  });
  document.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.id === 'anystore') { const v = $('#anystore-in').value.trim(); if (v) openURL(v); return; }
    if (f.id === 'track-f') { const inp = $('input', f); if (await trackInput(inp.value)) { inp.value = ''; S.trackVal = ''; } return; }
    if (f.id === 'st-search') {
      const T = S.st, q = $('#st-q').value.trim(); if (!T) return;
      if (!T.native) { if (q) { const u = WEB() ? null : (await G.searchUrls(q, [T.domain]).catch(() => null)); openURL(u && u.stores[0] ? u.stores[0].url : 'https://' + T.domain + '/'); } return; }
      if (!q) { T.results = null; T.q = ''; renderStore(); return; }
      T.q = q; T.results = []; const g = $('#sgrid'); if (g) g.innerHTML = skelHTML(8);
      const r = await G.shopSearch(q, T.domain).catch(() => []);
      if (S.st === T && T.q === q) { T.results = r; renderStore(); }
      return;
    }
    if (f.id === 'addr-f') {
      const a = $('#addr'), v = a.value.trim(); if (!v) return;
      const tb = activeTab();
      if (a.dataset.newtab || !tb) { delete a.dataset.newtab; try { await G.go(null, v); } catch (err) { toast(errText(err), 'bad'); } } else G.go(tb.id, v);
      a.blur(); G.focusPage().catch(() => {});
    }
  });
  $('#sheet-back').addEventListener('click', closeSheet);
  // a picture that fails to load just goes away (the placeholder behind it shows)
  document.addEventListener('error', (e) => { const t = e.target; if (t && t.tagName === 'IMG' && t.hasAttribute('data-drop-img')) { const l = t.closest('.logo-t'); if (l) l.classList.remove('on'); t.remove(); } }, true);

  // ---------- the top search: products everywhere, a store address, or a tracking number ----------
  // 1.6: it opens as a command panel over the screen (Cmd K, or the search in the masthead)
  const qEl = $('#q'), cmd = $('#cmd');
  function cmdBody() {
    const follows = S.favs.map(storeOf).filter(Boolean).slice(0, 6);
    const recent = (S.recentQ || []).slice(0, 4);
    return `${recent.length ? `<div class="cmd-sec"><div class="eye">Recent searches</div>${recent.map(q => `<button class="cmd-o" data-cmdq="${esc(q)}">${I.search}<span>${esc(q)}</span></button>`).join('')}</div>` : ''}
      <div class="cmd-sec"><div class="eye">Browse</div><div class="cmd-cats">${FEED_CATS.slice(1, 8).map(([id, n]) => `<button class="chip" data-cmdcat="${id}">${esc(n)}</button>`).join('')}</div></div>
      ${follows.length ? `<div class="cmd-sec"><div class="eye">Your stores</div><div class="cmd-cats">${follows.map(s => `<button class="chip" data-store="${esc(s.domain)}">${logoHTML(s.domain, s.name, 'xs')}${esc(s.name)}</button>`).join('')}</div></div>` : ''}
      <div class="cmd-sec tips"><div class="eye">Also works</div><div class="cmd-tip">${I.box}<span>Paste a tracking number to follow the parcel</span></div><div class="cmd-tip">${I.globe}<span>Type a store address, like allbirds.com, to open it</span></div></div>`;
  }
  let cmdTok = 0;
  function openCmd() { cmdTok++; cmd.classList.remove('out'); if (!cmd.hidden) { qEl.focus(); qEl.select(); return; } $('#cmd-body').innerHTML = cmdBody(); hydrate(cmd); cmd.hidden = false; syncBrowser(); qEl.focus(); qEl.select(); }
  function closeCmd() { if (cmd.hidden || cmd.classList.contains('out')) return; const tk = ++cmdTok; qEl.blur(); cmd.classList.add('out'); setTimeout(() => { if (tk !== cmdTok) return; cmd.hidden = true; cmd.classList.remove('out'); syncBrowser(); }, outMs(200)); }
  $('#q-trig').addEventListener('click', openCmd);
  cmd.addEventListener('click', (e) => {
    if (e.target === cmd) { closeCmd(); return; }
    const b = e.target.closest('[data-cmdq], [data-cmdcat], [data-store]'); if (!b) return;
    e.stopPropagation();
    if (b.dataset.cmdq) { qEl.value = b.dataset.cmdq; $('#search-f').requestSubmit(); return; }
    closeCmd();
    if (b.dataset.cmdcat != null) { go('home'); setFeedCat(b.dataset.cmdcat); return; }
    openNativeStore(b.dataset.store);
  });
  $('#search-f').addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = qEl.value.trim(); if (!v) return;
    closeCmd();
    const f = await G.parse(v).catch(() => null);
    if (f) { qEl.value = ''; trackInput(v); return; }
    if (/^(https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(\/\S*)?$/i.test(v)) { qEl.value = ''; const s = S.stores.find(x => x.domain === v.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')); if (s && s.shopify) openNativeStore(s.domain); else openURL(v); return; }
    S.recentQ = [v, ...(S.recentQ || []).filter(x => x.toLowerCase() !== v.toLowerCase())].slice(0, 6); store.set('drop-recent-q', S.recentQ);
    S.searchQ = v; S.searchStores = S.searchStores || defaultSearchStores(); if (S.view !== 'search') push('search'); render(); qEl.blur();
  });
  $('#clear').addEventListener('click', (e) => { e.preventDefault(); qEl.value = ''; $('#clear').hidden = true; qEl.focus(); });
  qEl.addEventListener('input', () => { $('#clear').hidden = !qEl.value; });
  function keys(k) {
    if (k === 'k') { openCmd(); return true; }
    if (WEB()) return false;
    if (k === 't') { go('shop'); setTimeout(() => { const a = $('#addr'); if (a) { a.value = ''; a.dataset.newtab = '1'; a.focus(); } }, 30); return true; }
    if (k === 'l') { if (S.view !== 'shop') go('shop'); setTimeout(() => { const a = $('#addr'); if (a) { a.focus(); a.select(); } }, 30); return true; }
    const tb = activeTab();
    if (S.view === 'shop' && tb) {
      if (k === 'w') { G.closeTab(tb.id); return true; }
      if (k === 'r') { G.nav(tb.id, 'reload'); return true; }
      if (k === '[') { G.nav(tb.id, 'back'); return true; }
      if (k === ']') { G.nav(tb.id, 'fwd'); return true; }
    }
    if (k === '[' && S.hist.length) { back(); return true; }
    return false;
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (!cmd.hidden) closeCmd(); else if (!$('#sheet').hidden) closeSheet(); else if (S.hist.length && !/INPUT|SELECT|TEXTAREA/.test((document.activeElement || {}).tagName || '')) back(); return; }
    const mod = isMac() ? e.metaKey : e.ctrlKey;
    if (mod && !e.altKey && keys(e.key.toLowerCase(), e.shiftKey)) e.preventDefault();
  });
  G.onKey(({ key, shift }) => keys(key, shift));

  // ---------- live data from main: patch what is on screen, do not rebuild the feed ----------
  let rT = null;
  const rerender = (views) => { if (views.includes(S.view)) { clearTimeout(rT); rT = setTimeout(render, 60); } badges(); };
  const patchHomeTop = () => { if (S.view !== 'home') return; clearTimeout(rT); rT = setTimeout(() => { const el = $('#home-top'); if (el) { el.innerHTML = homeTopHTML(); hydrate(el); } }, 60); };
  G.onTabs((st) => { const had = S.tabs.tabs.length; S.tabs = st; badges(); if (S.view === 'shop') paintBrowser(had === 0 || st.tabs.length === 0); });
  G.onSaved((l) => { setSaved(l); if (S.view === 'home') patchHomeTop(); rerender(['saved']); });
  G.onOrders((l) => { S.orders = l; if (!$('#sheet').hidden) { const id = $('#sheet [data-oremove]'); if (id && !l.some(o => o.id === id.dataset.oremove)) closeSheet(); } if (S.view === 'home') patchHomeTop(); rerender(['orders']); });
  G.onRecent((l) => { S.recent = l; rerender(['saved']); });
  G.onToast((t) => toast(t.msg, t.kind || 'ok', t.go || ''));
  G.onGoto((g) => { if (g && g.view) { go(g.view); if (g.view === 'orders' && g.id) setTimeout(() => openOrderSheet(g.id), 300); } });
  G.onBusy((b) => { S.busy = b; badges(); const l = $('#busy-line'); if (l) l.textContent = b ? 'Checking now' : 'Prices and parcels, right away.'; });

  // ---------- the update card and the restart screen ----------
  let UPD = {};
  const fmtBytes = (n) => { if (!n) return '0 MB'; const u = ['B', 'KB', 'MB', 'GB']; let i = 0; while (n >= 1024 && i < 3) { n /= 1024; i++; } return (i >= 2 ? n.toFixed(1) : Math.round(n)) + ' ' + u[i]; };
  function renderUpd(u) {
    if (!u) return;
    UPD = u;
    const card = $('#self-card'), btn = $('#self-btn'), alt = $('#self-alt');
    const v = String(u.latest || '').replace(/^v/, ''), s = u.status;
    const show = ['available', 'downloading', 'unpacking', 'ready'].includes(s) || (s === 'error' && !card.hidden);
    const was = card.hidden;
    if (show && card.hidden) card.hidden = false;
    if (!show && s !== 'installing') card.hidden = true;
    if (was !== card.hidden) requestAnimationFrame(syncBrowser);
    const pct = s === 'ready' || s === 'unpacking' ? 100 : s === 'downloading' ? (u.progress || 0) : 0;
    card.classList.toggle('calm', s === 'available' || s === 'error' || s === 'ready');
    $('#self-fill').style.transform = `scaleX(${pct / 100})`;
    $('#self-arc').style.strokeDashoffset = String(100 - pct);
    const T = {
      available: ['New version', `Drop ${v}`, 'Ready to download in the background.', 'Download', ''],
      downloading: ['Downloading', `Drop ${v}`, u.size ? `${fmtBytes(u.bytes || 0)} of ${fmtBytes(u.size)}${u.speed ? ' · ' + fmtBytes(u.speed) + '/s' : ''}` : 'Starting the download', '', 'Cancel'],
      unpacking: ['Almost there', `Checking ${v}`, 'Unpacking and verifying the download.', '', ''],
      ready: ['Ready to install', `Drop ${v} is here`, 'Restart to switch. Your tabs, carts and sign-ins stay.', 'Restart to update', ''],
      installing: ['Updating', 'Restarting Drop', '', '', ''],
      error: ['Update paused', 'The update hit a snag', u.error ? String(u.error).slice(0, 90) : 'Try again in a moment.', 'Try again', ''],
    }[s];
    if (T) { $('#self-eye').textContent = T[0]; $('#self-title').textContent = T[1]; $('#self-sub').textContent = T[2]; btn.textContent = T[3]; btn.hidden = !T[3]; btn.disabled = false; alt.textContent = T[4]; alt.hidden = !T[4]; }
    if (s === 'ready' && !card.dataset.ready) { card.dataset.ready = '1'; kick(btn, 0.8, 0.5); }
    const rs = $('#restart');
    if (s === 'installing') { $('#rs-num').textContent = v; $('#rs-sub').textContent = v ? `Back in a few seconds with Drop ${v}` : 'Back in a few seconds'; rs.hidden = false; G.browserRect(null).catch(() => {}); } else rs.hidden = true;
    if (u.justUpdated && !S.greeted) {
      S.greeted = true;
      setTimeout(() => toast(`Updated to Drop ${u.justUpdated}`), 900);
      const vv = String(u.justUpdated).split('.').slice(0, 2).join('.');
      if (vv === WHATS_NEW.version && !store.get('drop-seen-' + vv, false)) { store.set('drop-seen-' + vv, true); store.set('drop-welcomed', true); setTimeout(() => intro('whatsnew'), 1400); }
    }
  }
  G.onUpdater(renderUpd);
  if (G.onRates) G.onRates((r) => { S.rates = r; render(); });
  $('#self-btn').addEventListener('click', () => { if (UPD.status === 'error') { G.updCheck().catch(() => {}); return; } $('#self-btn').disabled = true; G.updInstall().catch(() => {}); });
  $('#self-alt').addEventListener('click', () => { if (UPD.status === 'downloading') G.updCancel().catch(() => {}); });

  // ---------- boot ----------
  (async () => {
    S.info = await G.info();
    S.recentQ = store.get('drop-recent-q', []);
    document.body.classList.add(S.info.web ? 'web' : isMac() ? 'mac' : 'win');
    $('#kbd').textContent = isMac() ? '⌘K' : 'Ctrl K';
    if (S.info.web) { const n = $('#nav-shop'); if (n) n.hidden = true; }
    if (S.appearance !== 'system') G.appearance(S.appearance).catch(() => {});
    const [d, favs, saved, orders, recent, settings, tabs] = await Promise.all([G.stores(), G.favorites(), G.saved(), G.orders(), G.recent(), G.settings(), G.tabs()]);
    Object.assign(S, { stores: d.stores, cats: d.categories, countries: d.countries, engines: d.engines, logos: new Set(d.logos || []), favs, orders, recent, settings, tabs });
    setSaved(saved);
    S.rates = G.rates ? await G.rates().catch(() => null) : null;
    badges(); render();
    G.updState().then(renderUpd).catch(() => {});
    G.ready();
    // first launch: the welcome; the first launch of a new version after an update: What's new (renderUpd)
    if (!store.get('drop-welcomed', false)) { store.set('drop-welcomed', true); store.set('drop-seen-' + WHATS_NEW.version, true); setTimeout(() => intro('welcome'), 350); }
    window.__drop = { go, render, S, currencyPicker, money, intro, toast, dialog, openOrderSheet, closeSheet, renderUpd, trackInput, openProduct, openNativeStore, back, loadFeed };
  })().catch(e => { console.warn('boot failed', e && e.message); G.ready(); });
})();
