'use strict';
// Drop 1.5: every price in the currency you choose. Pure (UMD): used by main, the renderer, the web shim and the
// unit tests. Rates come once a day from the ECB through frankfurter.dev (no key, no personal data sent), are kept
// with their date, and keep working offline. Conversion is for display only: price drops are still compared in the
// store's own currency (src/prices.js).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DropCurrency = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const URL = 'https://api.frankfurter.dev/v1/latest?base=USD';
  const DAY = 864e5;
  const CURRENCIES = [
    ['USD', 'US dollar'], ['EUR', 'Euro'], ['GBP', 'British pound'], ['JPY', 'Japanese yen'], ['CAD', 'Canadian dollar'], ['AUD', 'Australian dollar'],
    ['CHF', 'Swiss franc'], ['CNY', 'Chinese yuan'], ['HKD', 'Hong Kong dollar'], ['SGD', 'Singapore dollar'], ['NZD', 'New Zealand dollar'], ['SEK', 'Swedish krona'],
    ['NOK', 'Norwegian krone'], ['DKK', 'Danish krone'], ['PLN', 'Polish zloty'], ['CZK', 'Czech koruna'], ['HUF', 'Hungarian forint'], ['RON', 'Romanian leu'],
    ['TRY', 'Turkish lira'], ['ILS', 'Israeli new shekel'], ['INR', 'Indian rupee'], ['KRW', 'South Korean won'], ['IDR', 'Indonesian rupiah'], ['MYR', 'Malaysian ringgit'],
    ['PHP', 'Philippine peso'], ['THB', 'Thai baht'], ['MXN', 'Mexican peso'], ['BRL', 'Brazilian real'], ['ZAR', 'South African rand'], ['ISK', 'Icelandic krona'],
  ];
  const EURO = 'AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK'.split(' ');
  const REGION = { US: 'USD', GB: 'GBP', JP: 'JPY', CA: 'CAD', AU: 'AUD', CH: 'CHF', LI: 'CHF', CN: 'CNY', HK: 'HKD', SG: 'SGD', NZ: 'NZD', SE: 'SEK', NO: 'NOK', DK: 'DKK',
    PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON', TR: 'TRY', IL: 'ILS', IN: 'INR', KR: 'KRW', ID: 'IDR', MY: 'MYR', PH: 'PHP', TH: 'THB', MX: 'MXN', BR: 'BRL', ZA: 'ZAR', IS: 'ISK' };
  for (const r of EURO) REGION[r] = 'EUR';
  const known = (c) => CURRENCIES.some(x => x[0] === c);
  const nameOf = (c) => (CURRENCIES.find(x => x[0] === c) || [c, c])[1];

  // the currency of a locale such as en-GB or de_DE (USD when the region is not known)
  function defaultCurrency(locale) {
    const m = /[-_]([A-Za-z]{2})\b/.exec(String(locale || ''));
    return (m && REGION[m[1].toUpperCase()]) || 'USD';
  }
  // what the person picked: 'auto' (this computer's region), 'store' (each store's own) or a code
  function resolve(choice, locale) {
    if (choice === 'store') return '';
    if (choice && choice !== 'auto' && known(choice)) return choice;
    return defaultCurrency(locale);
  }
  // { base, date, rates, t } from the rates service's answer (null when it is not one)
  function parseRates(j, t = Date.now()) {
    if (!j || typeof j !== 'object' || !j.rates || typeof j.rates !== 'object') return null;
    const base = /^[A-Z]{3}$/.test(j.base || '') ? j.base : 'USD';
    const rates = { [base]: 1 };
    for (const [k, v] of Object.entries(j.rates)) if (/^[A-Z]{3}$/.test(k) && typeof v === 'number' && v > 0 && Number.isFinite(v)) rates[k] = v;
    if (Object.keys(rates).length < 3) return null;
    return { base, date: /^\d{4}-\d{2}-\d{2}$/.test(j.date || '') ? j.date : new Date(t).toISOString().slice(0, 10), rates, t };
  }
  // amount in `from` as `to`; null when either is unknown or there are no rates
  function convert(amount, from, to, R) {
    const n = Number(amount);
    if (amount == null || !Number.isFinite(n)) return null;
    if (!to || !from || from === to) return n;
    if (!R || !R.rates || !R.rates[from] || !R.rates[to]) return null;
    return n / R.rates[from] * R.rates[to];
  }
  function digits(cur) { try { return new Intl.NumberFormat('en', { style: 'currency', currency: cur }).resolvedOptions().maximumFractionDigits; } catch { return 2; } }
  // a price, the way that currency writes it: whole store prices without .00; converted prices rounded to the currency's digits
  function format(amount, cur, { locale, whole = true } = {}) {
    const n = Number(amount);
    if (amount == null || !Number.isFinite(n)) return '';
    const c = /^[A-Z]{3}$/.test(cur || '') ? cur : 'USD', d = digits(c);
    const frac = whole && Math.abs(n - Math.round(n)) < 1e-9 ? 0 : d;
    try { return new Intl.NumberFormat(locale || undefined, { style: 'currency', currency: c, minimumFractionDigits: frac, maximumFractionDigits: frac }).format(n); } catch { return c + ' ' + n.toFixed(frac); }
  }
  // what to show for a store price: { text, converted, original }; falls back to the store's own price when it cannot convert
  function display(amount, storeCur, want, R, opts = {}) {
    const cur = storeCur || 'USD';
    const original = format(amount, cur, opts);
    if (!original) return { text: '', converted: false, original: '' };
    const v = want && want !== cur ? convert(amount, cur, want, R) : null;
    if (v == null) return { text: original, converted: false, original };
    return { text: format(v, want, { ...opts, whole: false }), converted: true, original, cur: want };
  }
  // the daily rates: load() and save(r) keep them (a file, localStorage), fetchJSON(url) asks the service
  function createRates({ fetchJSON, load, save, now = () => Date.now(), offline = false, fixed = null }) {
    let cur = fixed || (() => { try { return parseRates(load && load(), 0) && load(); } catch { return null; } })() || null;
    let inflight = null;
    const get = () => cur;
    async function refresh(force = false) {
      if (fixed || offline) return cur;
      if (!force && cur && now() - (cur.t || 0) < DAY) return cur;
      if (inflight) return inflight;
      inflight = (async () => {
        try {
          const r = parseRates(await fetchJSON(URL), now());
          if (r) { cur = r; try { save && save(r); } catch {} }
        } catch {}
        inflight = null;
        return cur;
      })();
      return inflight;
    }
    return { get, refresh };
  }
  return { URL, CURRENCIES, defaultCurrency, resolve, parseRates, convert, format, display, createRates, nameOf, known, digits };
});
