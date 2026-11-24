// Inside Lumen, Surge updates together with Lumen. This stand-in keeps Surge's settings working and hands off to Lumen.
const H = () => globalThis.__lumenApps || {}
module.exports = {
  id: 'updater', name: 'Updates', icon: 'refresh', group: 'System', defaultEnabled: true,
  desc: 'Surge is part of Lumen now, so it updates every time Lumen does.',
  defaults: {}, schema: [{ t: 'actions', label: 'Update', opts: [['check', 'Check now'], ['install', 'Install update']] }],
  actions: {
    check: () => H().check && H().check(), install: () => H().install && H().install(), download: () => H().check && H().check(),
    later: () => {}, skip: () => {}, cancel: () => {}, state: () => (H().state ? H().state() : { status: 'idle' }),
  },
  start() {}, stop() {}, onSettings() {}, _check: () => H().check && H().check(), _migrating: () => false,
}
