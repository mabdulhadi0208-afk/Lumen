// Inside Lumen, Koi updates together with Lumen. This stand-in keeps Koi's menu working and hands off to Lumen.
const H = () => globalThis.__lumenApps || {}
const state = () => (H().state ? H().state() : { status: 'idle' })
const actions = {
  check: () => H().check && H().check(), download: () => H().check && H().check(), install: () => H().install && H().install(),
  later: () => {}, skip: () => {}, cancel: () => {}, state,
}
module.exports = { start() {}, actions, snapshot: state, _swapScript: () => '', _newer: () => false }
