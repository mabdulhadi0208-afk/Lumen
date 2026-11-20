// Smart tab grouping: sorts tabs into groups by what the site is (Video, Shopping, Work...).
const COLORS = ['blue', 'purple', 'pink', 'orange', 'yellow', 'green', 'teal', 'gray']
const CATEGORIES = [
  ['Music', 'pink', /(^|\.)(spotify\.com|music\.apple\.com|soundcloud\.com|anghami\.com|music\.youtube\.com|deezer\.com|tidal\.com)$/],
  ['Video', 'orange', /(^|\.)(youtube\.com|youtu\.be|netflix\.com|twitch\.tv|vimeo\.com|primevideo\.com|disneyplus\.com|shahid\.net|tiktok\.com|osn\.com|hulu\.com|max\.com)$/],
  ['AI', 'purple', /(^|\.)(claude\.ai|chatgpt\.com|openai\.com|gemini\.google\.com|perplexity\.ai|poe\.com|copilot\.microsoft\.com|grok\.com)$/],
  ['Social', 'blue', /(^|\.)(x\.com|twitter\.com|instagram\.com|facebook\.com|reddit\.com|linkedin\.com|snapchat\.com|threads\.net|discord\.com|web\.whatsapp\.com|pinterest\.com|tumblr\.com|bsky\.app)$/],
  ['Shopping', 'yellow', /(^|\.)(amazon\.[a-z.]+|noon\.com|aliexpress\.com|ebay\.[a-z.]+|shein\.com|temu\.com|etsy\.com|ikea\.com|namshi\.com|jarir\.com|extra\.com|walmart\.com|bestbuy\.com|target\.com|nike\.com|apple\.com)$/],
  ['Work', 'green', /(^|\.)(docs\.google\.com|drive\.google\.com|mail\.google\.com|calendar\.google\.com|meet\.google\.com|outlook\.(com|live\.com|office\.com)|office\.com|sharepoint\.com|notion\.so|slack\.com|teams\.microsoft\.com|zoom\.us|figma\.com|atlassian\.net|trello\.com|asana\.com|monday\.com|canva\.com|dropbox\.com|airtable\.com|miro\.com|linear\.app)$/],
  ['Dev', 'teal', /(^|\.)(github\.com|gitlab\.com|stackoverflow\.com|npmjs\.com|vercel\.com|netlify\.com|codepen\.io|developer\.mozilla\.org|developer\.apple\.com|localhost|pypi\.org|huggingface\.co)$/],
  ['News', 'gray', /(^|\.)(bbc\.(com|co\.uk)|cnn\.com|reuters\.com|nytimes\.com|aljazeera\.(com|net)|arabnews\.com|bloomberg\.com|theguardian\.com|news\.google\.com|apnews\.com|ft\.com|wsj\.com|sky\.com|cnbc\.com)$/],
]
function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' } }
function categorize(url) {
  const h = hostOf(url)
  if (!h) return null
  for (const [name, color, re] of CATEGORIES) if (re.test(h)) return { name, color }
  return null
}
function siteName(h) { if (/^[\d.:]+$/.test(h) || h === 'localhost') return h.split(':')[0]; const parts = h.split('.'); const core = parts.length > 2 ? parts[parts.length - 2] : parts[0]; return core.charAt(0).toUpperCase() + core.slice(1) }

// tabs: [{ id, url, title }] -> [{ name, color, ids: [...] }]
function autoGroup(tabs) {
  const buckets = new Map()
  const rest = []
  for (const t of tabs) {
    const c = categorize(t.url)
    if (c) { if (!buckets.has(c.name)) buckets.set(c.name, { ...c, ids: [] }); buckets.get(c.name).ids.push(t.id) }
    else rest.push(t)
  }
  // anything else: group by site when a site has 2 or more tabs
  const bySite = new Map()
  for (const t of rest) { const h = hostOf(t.url); if (!h) continue; if (!bySite.has(h)) bySite.set(h, []); bySite.get(h).push(t.id) }
  let ci = 0
  for (const [h, ids] of bySite) if (ids.length >= 2) buckets.set('site:' + h, { name: siteName(h), color: COLORS[ci++ % COLORS.length], ids })
  return [...buckets.values()].filter(g => g.ids.length >= 2)
}

module.exports = { autoGroup, categorize, COLORS }
