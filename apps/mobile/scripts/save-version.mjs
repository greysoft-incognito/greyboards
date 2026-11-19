import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const [version, buildNumber] = process.argv.slice(2)

if (!version || !Number.isInteger(Number(buildNumber))) {
  console.error('Usage: node scripts/save-version.mjs <version> <build number>')
  process.exit(1)
}

const file = fileURLToPath(new URL('../app.json', import.meta.url))
const config = JSON.parse(readFileSync(file, 'utf8'))

config.expo.version = version
config.expo.android = { ...config.expo.android, versionCode: Number(buildNumber) }
config.expo.ios = { ...config.expo.ios, buildNumber: String(buildNumber) }

writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`)
