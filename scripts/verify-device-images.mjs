#!/usr/bin/env node
/**
 * Ensures every DEVICE_IMAGES entry points at an on-disk WebP and that
 * _import-map.json hashes exist.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const devicesDir = join(root, 'public', 'devices')

const imagesTs = readFileSync(
  join(root, 'src/data/deviceImages.ts'),
  'utf8',
)
const mapJson = JSON.parse(
  readFileSync(join(devicesDir, '_import-map.json'), 'utf8'),
)

const fromTs = [
  ...imagesTs.matchAll(/'([^']+)':\s*img\('([a-f0-9]+)'\)/g),
].map(([, id, hash]) => ({ id, hash, file: `img-${hash}.webp` }))

let fails = 0
for (const { id, hash, file } of fromTs) {
  const path = join(devicesDir, file)
  if (!existsSync(path)) {
    console.log(`FAIL\t${id}\tmissing ${file}`)
    fails++
  }
}

for (const [deviceId, hash] of Object.entries(mapJson)) {
  if (typeof hash !== 'string') continue
  const file = `img-${hash}.webp`
  const path = join(devicesDir, file)
  if (!existsSync(path)) {
    console.log(`FAIL\t_import-map ${deviceId}\tmissing ${file}`)
    fails++
  }
}

if (fails === 0) {
  console.log(`OK\t${fromTs.length} deviceImages entries + ${Object.keys(mapJson).length} import-map hashes`)
}
process.exit(fails > 0 ? 1 : 0)
