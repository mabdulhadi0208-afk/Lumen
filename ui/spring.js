// Spring physics, tuned down: critically-leaning damping so things settle with a soft, small overshoot.
// calm   ~ damping ratio 0.82 (default)    lively ~ 0.62    off = instant
const SPRING_PRESETS = {
  calm: { stiffness: 240, damping: 25.5, mass: 1 },
  lively: { stiffness: 320, damping: 22, mass: 1 },
  snappy: { stiffness: 420, damping: 36, mass: 1 },
  gentle: { stiffness: 150, damping: 22, mass: 1 },
}
let MOTION = 'calm'
const active = new Set()
let raf = 0, last = 0

function tick(now) {
  const dt = Math.min(0.064, (now - (last || now)) / 1000)
  last = now
  for (const s of [...active]) s._step(dt)
  if (active.size) raf = requestAnimationFrame(tick)
  else { raf = 0; last = 0 }
}

class Spring {
  constructor(value = 0, preset = 'calm', onUpdate = null) {
    this.value = value; this.target = value; this.velocity = 0
    this.preset = preset; this.onUpdate = onUpdate; this.onRest = null
  }
  cfg() {
    const base = SPRING_PRESETS[this.preset] || SPRING_PRESETS.calm
    if (MOTION === 'lively' && this.preset === 'calm') return SPRING_PRESETS.lively
    return base
  }
  to(target, { velocity } = {}) {
    this.target = target
    if (velocity !== undefined) this.velocity = velocity
    if (MOTION === 'off') return this.set(target)
    if (Math.abs(this.target - this.value) < 0.001 && Math.abs(this.velocity) < 0.001) { this.value = target; this.onUpdate && this.onUpdate(this.value); return this }
    active.add(this)
    if (!raf) raf = requestAnimationFrame(tick)
    return this
  }
  set(v) { this.value = v; this.target = v; this.velocity = 0; active.delete(this); this.onUpdate && this.onUpdate(v); return this }
  _step(dt) {
    const { stiffness: k, damping: c, mass: m } = this.cfg()
    const steps = Math.max(1, Math.ceil(dt / (1 / 240)))
    const h = dt / steps
    for (let i = 0; i < steps; i++) {
      const f = -k * (this.value - this.target) - c * this.velocity
      this.velocity += (f / m) * h
      this.value += this.velocity * h
    }
    const scale = Math.max(1, Math.abs(this.target)) * 0.0005 + 0.002
    if (Math.abs(this.velocity) < scale * 10 && Math.abs(this.value - this.target) < scale) {
      this.value = this.target; this.velocity = 0; active.delete(this)
      this.onUpdate && this.onUpdate(this.value)
      this.onRest && this.onRest()
      return
    }
    this.onUpdate && this.onUpdate(this.value)
  }
  get moving() { return active.has(this) }
}

// Animate several numeric properties of one element with springs.
class SpringGroup {
  constructor(initial, preset, render) {
    this.springs = {}
    this.render = render
    this.state = { ...initial }
    let queued = false
    const flush = () => { queued = false; this.render(this.state) }
    for (const k of Object.keys(initial)) {
      this.springs[k] = new Spring(initial[k], preset, v => { this.state[k] = v; if (!queued) { queued = true; queueMicrotask(flush) } })
    }
    this.render(this.state)
  }
  to(vals, opts) { for (const [k, v] of Object.entries(vals)) if (this.springs[k]) this.springs[k].to(v, opts); return this }
  set(vals) { for (const [k, v] of Object.entries(vals)) if (this.springs[k]) this.springs[k].set(v); return this }
  get moving() { return Object.values(this.springs).some(s => s.moving) }
  onRest(fn) {
    const check = () => { if (!this.moving) fn(); else requestAnimationFrame(check) }
    requestAnimationFrame(check)
  }
}

function setMotion(m) { MOTION = m || 'calm' }
window.Spring = Spring; window.SpringGroup = SpringGroup; window.setMotion = setMotion
window.getMotion = () => MOTION
