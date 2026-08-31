#!/usr/bin/env node
/**
 * Ensures every DEVICE_IMAGES entry points at an on-disk WebP,
 * shared hashes are allow-listed, and Cisco cutouts have an alpha channel.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const devicesDir = join(root, 'public', 'devices')

const imagesTs = readFileSync(join(root, 'src/data/deviceImages.ts'), 'utf8')
const mapJson = JSON.parse(
  readFileSync(join(devicesDir, '_import-map.json'), 'utf8'),
)
const shared = JSON.parse(
  readFileSync(join(devicesDir, '_shared-heroes.json'), 'utf8'),
)

const fromTs = [
  ...imagesTs.matchAll(/'([^']+)':\s*img\('([a-f0-9]+)'\)/g),
].map(([, id, hash]) => ({ id, hash, file: `img-${hash}.webp` }))

let fails = 0
for (const { id, file } of fromTs) {
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

const allowedShared = new Set()
for (const group of shared.groups ?? []) {
  const key = [...group].sort().join('|')
  allowedShared.add(key)
}

const byHash = new Map()
for (const { id, hash } of fromTs) {
  if (!byHash.has(hash)) byHash.set(hash, [])
  byHash.get(hash).push(id)
}

for (const [hash, ids] of byHash) {
  const unique = [...new Set(ids)]
  if (unique.length < 2) continue
  const key = unique.slice().sort().join('|')
  if (!allowedShared.has(key)) {
    console.log(`FAIL\tshared-hash ${hash}\t${unique.join(', ')}`)
    fails++
  }
}

function webpHasAlpha(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF') return false
  if (buf.toString('ascii', 8, 12) !== 'WEBP') return false
  let offset = 12
  while (offset + 8 <= buf.length) {
    const fourcc = buf.toString('ascii', offset, offset + 4)
    const size = buf.readUInt32LE(offset + 4)
    if (fourcc === 'VP8X' && offset + 8 < buf.length) {
      const flags = buf[offset + 8]
      return (flags & 0x10) !== 0
    }
    offset += 8 + size + (size % 2)
  }
  return false
}

for (const { id, file } of fromTs) {
  if (
    id.startsWith('logitech-') ||
    id.startsWith('poly-') ||
    id.startsWith('neat-')
  ) {
    continue
  }
  const path = join(devicesDir, file)
  if (!existsSync(path)) continue
  const buf = readFileSync(path)
  if (!webpHasAlpha(buf)) {
    console.log(`FAIL\t${id}\t${file} has no alpha (white-box risk)`)
    fails++
  }
}

if (fails === 0) {
  console.log(
    `OK\t${fromTs.length} deviceImages entries + ${Object.keys(mapJson).length} import-map hashes`,
  )
}
process.exit(fails > 0 ? 1 : 0)
