// Tiny JSON store with debounced atomic writes.
const fs = require('fs')
const path = require('path')
const { app } = require('electron')

class Store {
  constructor(name, defaults) {
    this.file = path.join(app.getPath('userData'), name + '.json')
    this.defaults = defaults
    this.data = structuredClone(defaults)
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'))
      if (Array.isArray(defaults)) this.data = Array.isArray(raw) ? raw : this.data
      else this.data = Object.assign(structuredClone(defaults), raw)
    } catch {}
    this.timer = null
    this.listeners = new Set()
  }
  get(key) { return key === undefined ? this.data : this.data[key] }
  set(key, value) {
    if (typeof key === 'object') Object.assign(this.data, key)
    else this.data[key] = value
    this.save()
  }
  replace(data) { this.data = data; this.save() }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn) }
  save() {
    for (const fn of this.listeners) { try { fn(this.data) } catch {} }
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.flushSoon(), 400)
  }
  // the usual save: the file is written off the main thread, so a big history never stalls the browser.
  // One write at a time; a change made meanwhile is written right after. flush() stays synchronous (quit, tests).
  flushSoon() {
    clearTimeout(this.timer); this.timer = null
    if (this.writing) { this.again = true; return }
    let json; try { json = JSON.stringify(this.data) } catch (e) { console.error('store write failed', this.file, e.message); return }
    const gen = this.gen = (this.gen || 0) + 1, tmp = this.file + '.tmp' + gen
    this.writing = true
    fs.promises.mkdir(path.dirname(this.file), { recursive: true }).then(() => fs.promises.writeFile(tmp, json)).then(() => {
      // a synchronous flush() since then already wrote newer data: this older copy is dropped
      if (this.gen === gen) fs.renameSync(tmp, this.file); else fs.promises.unlink(tmp).catch(() => {})
    }).catch(e => { console.error('store write failed', this.file, e.message); fs.promises.unlink(tmp).catch(() => {}) }).finally(() => {
      this.writing = false
      if (this.again) { this.again = false; this.flushSoon() }
    })
  }
  flush() {
    clearTimeout(this.timer); this.timer = null
    this.gen = (this.gen || 0) + 1; this.again = false
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true })
      const tmp = this.file + '.tmp'
      fs.writeFileSync(tmp, JSON.stringify(this.data))
      fs.renameSync(tmp, this.file)
    } catch (e) { console.error('store write failed', this.file, e.message) }
  }
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

module.exports = { Store, uid }
