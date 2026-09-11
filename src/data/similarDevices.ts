import type { Device, VendorId } from './types'
import { VENDOR_ORDER } from './types'
import { DEVICES_BY_ID } from './catalog'

export interface SimilarPeer {
  device: Device
  reason: string
  curated: boolean
}

type CuratedLink = { id: string; reason: string }

/** Editorial pairs — one analog per other vendor where the lineups overlap. */
const CURATED: Record<string, CuratedLink[]> = {
  'room-bar': [
    { id: 'logitech-rally-bar-mini', reason: 'Huddle / small video bar' },
    { id: 'poly-studio-x50', reason: 'Huddle / small video bar' },
    { id: 'neat-bar', reason: 'Huddle / small video bar' },
  ],
  'room-bar-pro': [
    { id: 'logitech-rally-bar', reason: 'Medium-room video bar' },
    { id: 'poly-studio-x70', reason: 'Medium-room video bar' },
    { id: 'neat-bar-pro', reason: 'Medium-room video bar' },
  ],
  'room-bar-byod': [
    { id: 'logitech-meetup-2', reason: 'BYOD / USB huddle bar' },
    { id: 'poly-studio-x30', reason: 'Small-room all-in-one bar' },
  ],
  'board-pro-g3-55': [
    { id: 'logitech-rally-board-65', reason: 'Interactive collaboration board' },
    { id: 'neat-board-50', reason: 'Interactive collaboration board' },
  ],
  'board-pro-g3-75': [
    { id: 'logitech-rally-board-65', reason: 'Large interactive board' },
    { id: 'neat-board-pro', reason: 'Large interactive board' },
  ],
  'room-kit-eq': [
    { id: 'logitech-rally-bar', reason: 'Codec + bar room kit' },
    { id: 'poly-studio-x52', reason: 'Medium-room all-in-one' },
  ],
  'room-kit-eqx': [
    { id: 'logitech-rally-plus', reason: 'Large-room camera + codec kit' },
    { id: 'poly-studio-x70', reason: 'Large-room video bar' },
  ],
  'room-kit-pro-g2': [
    { id: 'logitech-rally-plus', reason: 'Large-room camera + codec kit' },
    { id: 'poly-studio-x72', reason: 'Large-room video bar' },
  ],
  desk: [
    { id: 'poly-studio-p15', reason: 'Personal desk video device' },
    { id: 'neat-frame', reason: 'Personal desk video device' },
  ],
  'desk-mini': [
    { id: 'poly-studio-p15', reason: 'Compact personal video device' },
    { id: 'neat-frame', reason: 'Compact personal video device' },
  ],
  'desk-pro-g2': [
    { id: 'poly-studio-p15', reason: 'Premium personal desk device' },
    { id: 'neat-frame', reason: 'Premium personal desk device' },
  ],
  'desk-phone-9841': [{ id: 'poly-edge-e350', reason: 'Color desk phone' }],
  'desk-phone-9851': [{ id: 'poly-ccx-505', reason: 'Color touch desk phone' }],
  'desk-phone-9861': [{ id: 'poly-ccx-600', reason: 'Color touch desk phone' }],
  'desk-phone-9871': [{ id: 'poly-ccx-700', reason: 'Touch video desk phone' }],
  'video-phone-8875': [{ id: 'poly-ccx-700', reason: 'Touch video desk phone' }],
  'conference-8832': [{ id: 'poly-trio-c60', reason: 'Table conference phone' }],
  'conference-7832': [{ id: 'poly-trio-8300', reason: 'Table conference phone' }],
  'headset-730': [
    { id: 'logitech-zone-wireless-2', reason: 'Wireless stereo headset' },
    { id: 'poly-voyager-focus-2', reason: 'Wireless stereo headset' },
  ],
  'headset-720': [
    { id: 'logitech-zone-wireless-2', reason: 'Wireless stereo headset' },
    { id: 'poly-voyager-focus-2', reason: 'Wireless stereo headset' },
  ],
  'headset-560': [
    { id: 'logitech-zone-wired-2', reason: 'Wired office headset' },
    { id: 'poly-blackwire-5200', reason: 'Wired office headset' },
  ],
  'room-navigator-table': [
    { id: 'logitech-tap-ip', reason: 'Tabletop room controller' },
    { id: 'poly-tc10', reason: 'Tabletop room controller' },
    { id: 'neat-pad', reason: 'Tabletop room controller' },
  ],
  'room-navigator-wall': [
    { id: 'logitech-tap-scheduler', reason: 'Wall room scheduler' },
    { id: 'neat-pad', reason: 'Room scheduling / control pad' },
  ],
  'room-vision-ptz': [
    { id: 'logitech-rally-camera', reason: 'Room PTZ camera' },
    { id: 'poly-studio-e70', reason: 'Room PTZ camera' },
  ],
  'ptz-4k-camera': [
    { id: 'logitech-rally-ai-camera', reason: 'Room PTZ camera' },
    { id: 'poly-studio-e70', reason: 'Room PTZ camera' },
  ],
  'table-mic-pro': [{ id: 'neat-center', reason: 'Table intelligent microphone' }],
}

function curatedIndex(): Record<string, CuratedLink[]> {
  const out: Record<string, CuratedLink[]> = {}
  const add = (from: string, link: CuratedLink) => {
    const list = out[from] ?? (out[from] = [])
    if (!list.some((row) => row.id === link.id)) list.push(link)
  }
  for (const [id, peers] of Object.entries(CURATED)) {
    for (const peer of peers) {
      add(id, peer)
      add(peer.id, { id, reason: peer.reason })
    }
  }
  return out
}

const CURATED_INDEX = curatedIndex()

function overlapCount<T>(a: readonly T[], b: readonly T[]): number {
  const set = new Set(a)
  return b.reduce((n, x) => n + (set.has(x) ? 1 : 0), 0)
}

function scorePeer(from: Device, to: Device): number {
  if (from.id === to.id || from.vendorId === to.vendorId) return -1
  if (from.category !== to.category) return -1
  let score = 1
  if (from.shape === to.shape) score += 4
  score += overlapCount(from.roomSizes, to.roomSizes) * 2
  const fromPlatforms = Object.keys(from.platforms ?? {})
  const toPlatforms = Object.keys(to.platforms ?? {})
  score += overlapCount(fromPlatforms, toPlatforms)
  return score
}

function fallbackReason(from: Device, to: Device): string {
  if (from.shape === to.shape) return `Same form · ${to.formFactor}`
  return to.formFactor
}

function bestPerVendor(
  from: Device,
  catalog: Device[],
): SimilarPeer[] {
  const best = new Map<VendorId, { device: Device; score: number }>()
  for (const other of catalog) {
    const score = scorePeer(from, other)
    if (score < 2) continue
    const prev = best.get(other.vendorId)
    if (!prev || score > prev.score) {
      best.set(other.vendorId, { device: other, score })
    }
  }
  return VENDOR_ORDER.filter((id) => id !== from.vendorId)
    .map((id) => best.get(id))
    .filter((row): row is { device: Device; score: number } => Boolean(row))
    .map(({ device }) => ({
      device,
      reason: fallbackReason(from, device),
      curated: false,
    }))
}

/** Up to one analog per other vendor in the current catalog. */
export function similarDevices(
  device: Device,
  catalog: Device[],
  limit = 3,
): SimilarPeer[] {
  const available = new Map(catalog.map((d) => [d.id, d]))
  const curated = (CURATED_INDEX[device.id] ?? [])
    .map((link) => {
      const peer = available.get(link.id) ?? DEVICES_BY_ID.get(link.id)
      if (!peer || !available.has(peer.id) || peer.vendorId === device.vendorId) {
        return null
      }
      return { device: peer, reason: link.reason, curated: true }
    })
    .filter((row): row is SimilarPeer => Boolean(row))

  const seen = new Set(curated.map((row) => row.device.id))
  const fallback = bestPerVendor(device, catalog).filter(
    (row) => !seen.has(row.device.id),
  )

  const merged: SimilarPeer[] = []
  for (const row of [...curated, ...fallback]) {
    if (merged.some((m) => m.device.vendorId === row.device.vendorId)) continue
    merged.push(row)
    if (merged.length >= limit) break
  }
  return merged
}
