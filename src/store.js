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
    this.timer = setTimeout(() => this.flush(), 400)
  }
  flush() {
    clearTimeout(this.timer)
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
