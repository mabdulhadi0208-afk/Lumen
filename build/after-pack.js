// Ad-hoc sign the whole app after packing so Apple Silicon Macs will open it
// (an unsigned or half-signed app shows up as "damaged").
const { execSync } = require('child_process')
const path = require('path')
exports.default = async function (ctx) {
  if (ctx.electronPlatformName !== 'darwin') return
  const app = path.join(ctx.appOutDir, `${ctx.packager.appInfo.productFilename}.app`)
  execSync(`xattr -cr "${app}"`)
  execSync(`codesign --force --deep --sign - "${app}"`, { stdio: 'inherit' })
  execSync(`codesign --verify --deep --strict "${app}"`, { stdio: 'inherit' })
}
