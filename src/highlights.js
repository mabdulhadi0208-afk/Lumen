// Highlights: select text, right-click, Highlight. Saved per page and painted again every visit.
// Painting uses the CSS Custom Highlight API, so the page's own HTML is never changed.
const WORLD = 1021
const COLORS = { yellow: 'rgba(255, 214, 10, .42)', green: 'rgba(52, 199, 89, .32)', blue: 'rgba(10, 132, 255, .28)', pink: 'rgba(255, 55, 145, .28)' }
const CSS = Object.entries(COLORS).map(([k, c]) => `::highlight(lumen-${k}) { background-color: ${c}; }`).join('\n')

// shared helpers that run inside the page
const LIB = `
  const H = window.__lumenHL || (window.__lumenHL = { items: new Map() })
  const textIndex = () => {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/.test(n.parentNode && n.parentNode.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT })
    const nodes = [], starts = []; let all = '', n
    while ((n = w.nextNode())) { starts.push(all.length); nodes.push(n); all += n.nodeValue }
    return { nodes, starts, all }
  }
  const at = (ix, off) => { let lo = 0, hi = ix.starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (ix.starts[mid] <= off) lo = mid; else hi = mid - 1 } return [ix.nodes[lo], off - ix.starts[lo]] }
  const paint = () => {
    if (!window.CSS || !CSS.highlights) return
    const by = {}
    for (const h of H.items.values()) (by[h.color] = by[h.color] || []).push(h.range)
    for (const c of ${JSON.stringify(Object.keys(COLORS))}) { if (by[c]) CSS.highlights.set('lumen-' + c, new Highlight(...by[c])); else CSS.highlights.delete('lumen-' + c) }
  };
`

// wrap the current selection; returns { text, prefix, suffix } to save
const ADD = (id, color) => `(() => { ${LIB}
  const sel = getSelection(); if (!sel || !sel.rangeCount || sel.isCollapsed) return null
  const range = sel.getRangeAt(0).cloneRange()
  const text = String(sel).trim(); if (!text) return null
  const ix = textIndex()
  // where the selection starts in the same text the restore step searches (scripts and styles left out)
  let start = -1
  const k = ix.nodes.indexOf(range.startContainer)
  if (k >= 0) start = ix.starts[k] + range.startOffset
  else { const j = ix.all.indexOf(text); start = j }
  if (start < 0) start = 0
  H.items.set(${JSON.stringify(id)}, { color: ${JSON.stringify(color)}, range })
  paint(); sel.removeAllRanges()
  return { text: String(range).slice(0, 2000), prefix: ix.all.slice(Math.max(0, start - 32), start), suffix: ix.all.slice(start + String(range).length, start + String(range).length + 32) }
})()`

// paint saved highlights; finds each by its text and the words around it
const RESTORE = list => `(() => { ${LIB}
  const ix = textIndex(); let found = 0
  for (const h of ${JSON.stringify(list)}) {
    if (H.items.has(h.id)) { found++; continue }
    let i = ix.all.indexOf(h.prefix + h.text + h.suffix), off = h.prefix.length
    if (i < 0) { i = ix.all.indexOf(h.text); off = 0 }
    if (i < 0) continue
    const s = i + off, e = s + h.text.length
    const [sn, so] = at(ix, s), [en, eo] = at(ix, e)
    try { const r = document.createRange(); r.setStart(sn, so); r.setEnd(en, Math.min(eo, en.nodeValue.length)); H.items.set(h.id, { color: h.color, range: r }); found++ } catch {}
  }
  paint(); return found
})()`

// which highlight is under the mouse (x, y in page coordinates)
const HIT = (x, y) => `(() => { ${LIB}
  const p = document.caretPositionFromPoint ? document.caretPositionFromPoint(${x}, ${y}) : null
  if (!p) return null
  for (const [id, h] of H.items) { try { if (h.range.isPointInRange(p.offsetNode, p.offset)) return id } catch {} }
  return null
})()`
const REMOVE = id => `(() => { ${LIB} H.items.delete(${JSON.stringify(id)}); paint(); return true })()`
const RECOLOR = (id, color) => `(() => { ${LIB} const h = H.items.get(${JSON.stringify(id)}); if (h) h.color = ${JSON.stringify(color)}; paint(); return !!h })()`

const pageKey = url => { try { const u = new URL(url); u.hash = ''; return u.href } catch { return '' } }
const run = (wc, code) => wc.executeJavaScriptInIsolatedWorld(WORLD, [{ code }])

module.exports = {
  COLORS, CSS, pageKey,
  add: (wc, id, color) => run(wc, ADD(id, color)),
  restore: (wc, list) => run(wc, RESTORE(list)),
  hit: (wc, x, y) => run(wc, HIT(x, y)).catch(() => null),
  remove: (wc, id) => run(wc, REMOVE(id)).catch(() => false),
  recolor: (wc, id, color) => run(wc, RECOLOR(id, color)).catch(() => false),
}
