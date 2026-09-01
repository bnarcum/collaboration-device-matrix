import type { Category, Device } from '../data/types'
import { CATEGORY_ORDER } from '../data/types'
import { estimateBillboardPlane } from './billboardSizing'

export interface ShowroomPlacement {
  device: Device
  position: [number, number, number]
  rotationY: number
}

export interface ShowroomRing {
  category: Category
  radius: number
  /** World-space floor label, outside the rotated ring mesh. */
  labelPosition: [number, number, number]
  thetaStart: number
  thetaLength: number
  showLabel: boolean
}

export interface ShowroomLayout {
  rings: ShowroomRing[]
  placements: ShowroomPlacement[]
}

/** Gap between billboard footprints along a filtered arc (meters). */
const COMPACT_GAP = 0.32

/** All-view full rings: extra along-arc space for the always-on name pill. */
const ALL_GAP = 0.7
const ALL_LABEL_PAD = 0.4
const ALL_RADIAL_GAP = 1.55
const ALL_CATEGORY_GAP = 1.25
const ALL_INNER_RADIUS = 3.6
const TAU = Math.PI * 2

/** Front-facing horseshoe, opening toward +Z (camera). */
export const ARC_SWEEP = (168 * Math.PI) / 180
export const ARC_CENTER = -Math.PI / 2

const MIN_ARC_RADIUS = 1.15
const TWO_ROW_COUNT = 12
const TWO_ROW_RADIUS = 2.7
const THREE_ROW_COUNT = 28
const THREE_ROW_RADIUS = 5.0
const ROW_GAP = 0.52

function deviceFootprint(device: Device): number {
  return estimateBillboardPlane(device).footprint
}

function packedArcLength(devices: Device[]): number {
  if (devices.length === 0) return 0
  const bodies = devices.reduce((sum, d) => sum + deviceFootprint(d), 0)
  return bodies + COMPACT_GAP * Math.max(0, devices.length - 1)
}

function packRow(
  devices: Device[],
  minR: number,
  stagger = 0,
): { radius: number; slots: { radius: number; angle: number }[] } {
  if (devices.length === 0) {
    return { radius: minR, slots: [] }
  }
  if (devices.length === 1) {
    return {
      radius: minR,
      slots: [{ radius: minR, angle: ARC_CENTER + stagger }],
    }
  }

  const arcLen = packedArcLength(devices)
  const radius = Math.max(minR, arcLen / ARC_SWEEP)
  let cursor = -arcLen / 2
  const slots = devices.map((d) => {
    const foot = deviceFootprint(d)
    const mid = cursor + foot / 2
    cursor += foot + COMPACT_GAP
    return { radius, angle: ARC_CENTER + mid / radius + stagger }
  })
  return { radius, slots }
}

function rowCountFor(devices: Device[]): number {
  const n = devices.length
  if (n <= 1) return 1
  const oneR = Math.max(MIN_ARC_RADIUS, packedArcLength(devices) / ARC_SWEEP)
  if (n < TWO_ROW_COUNT && oneR <= TWO_ROW_RADIUS) return 1

  const half = Math.ceil(n / 2)
  const twoR = Math.max(
    MIN_ARC_RADIUS,
    packedArcLength(devices.slice(0, half)) / ARC_SWEEP,
  )
  if (n < THREE_ROW_COUNT && twoR <= THREE_ROW_RADIUS) return 2
  return 3
}

function splitRows(devices: Device[], rows: number): Device[][] {
  const out: Device[][] = Array.from({ length: rows }, () => [])
  const base = Math.floor(devices.length / rows)
  let extra = devices.length % rows
  let i = 0
  for (let r = 0; r < rows; r++) {
    const take = base + (extra > 0 ? 1 : 0)
    if (extra > 0) extra -= 1
    out[r] = devices.slice(i, i + take)
    i += take
  }
  return out
}

/** RingGeometry lives in local XY; after -X 90° it maps θ → world angle −θ. */
export function arcRingTheta(sweep = ARC_SWEEP): {
  thetaStart: number
  thetaLength: number
} {
  return {
    thetaStart: Math.PI / 2 - sweep / 2,
    thetaLength: sweep,
  }
}

/**
 * Filtered view: front-facing horseshoe so every SKU stays in camera.
 * Large / wide sets split into two or three concentric arcs.
 */
export function compactSlots(devices: Device[]): {
  slots: { radius: number; angle: number }[]
  rings: { radius: number; thetaStart: number; thetaLength: number }[]
} {
  const theta = arcRingTheta()
  if (devices.length === 0) {
    return { slots: [], rings: [{ radius: MIN_ARC_RADIUS, ...theta }] }
  }

  const rows = splitRows(devices, rowCountFor(devices))
  const slots: { radius: number; angle: number }[] = []
  const rings: { radius: number; thetaStart: number; thetaLength: number }[] =
    []

  // rows[0] is the back (outer) row.
  const packed = rows.map((row, i) => {
    const isFront = i === rows.length - 1
    const stagger =
      !isFront && row.length > 1 && (rows[i + 1]?.length ?? 0) > 1
        ? 0.08
        : 0
    return packRow(row, MIN_ARC_RADIUS, stagger)
  })

  // Enforce increasing radius toward the back so rows do not collide.
  for (let i = packed.length - 1; i >= 0; i--) {
    const front = packed[i + 1]
    if (!front) continue
    const neighborFoot = Math.max(
      ...rows[i].map(deviceFootprint),
      ...rows[i + 1].map(deviceFootprint),
      0.4,
    )
    const clearance = front.radius + neighborFoot * 0.35 + ROW_GAP
    if (packed[i].radius < clearance) {
      const bump = clearance - packed[i].radius
      packed[i] = {
        radius: clearance,
        slots: packed[i].slots.map((s) => ({
          ...s,
          radius: s.radius + bump,
        })),
      }
    }
  }

  packed.forEach((row) => {
    slots.push(...row.slots)
    rings.push({ radius: row.radius, ...theta })
  })

  return { slots, rings }
}

function arcWidth(device: Device): number {
  const plane = estimateBillboardPlane(device)
  return Math.max(plane.planeW, 0.42) + ALL_LABEL_PAD
}

function radialClearance(device: Device): number {
  const plane = estimateBillboardPlane(device)
  return Math.max(plane.planeH, plane.planeW) * 0.5
}

function packedCircleNeed(devices: Device[]): number {
  if (devices.length === 0) return 0
  return (
    devices.reduce((sum, d) => sum + arcWidth(d), 0) + ALL_GAP * devices.length
  )
}

function packOnCircle(
  devices: Device[],
  minR: number,
  stagger = 0,
): { radius: number; slots: { radius: number; angle: number }[] } {
  if (devices.length === 0) {
    return { radius: minR, slots: [] }
  }
  const need = packedCircleNeed(devices)
  const radius = Math.max(minR, need / TAU)
  let cursor = stagger * radius
  const slots = devices.map((d) => {
    const w = arcWidth(d)
    const mid = cursor + w / 2
    cursor += w + ALL_GAP
    return { radius, angle: mid / radius }
  })
  return { radius, slots }
}

function ringsForCircle(devices: Device[], minR: number): number {
  const n = devices.length
  if (n <= 1) return 1
  for (let rows = 1; rows <= n; rows++) {
    const groups = splitRows(devices, rows)
    let r = minR
    let fits = true
    for (const row of groups) {
      if (packedCircleNeed(row) / TAU > r + 0.02) {
        fits = false
        break
      }
      const clear = Math.max(...row.map(radialClearance), 0.35)
      r += clear + ALL_RADIAL_GAP
    }
    if (fits) return rows
  }
  return n
}

/**
 * All-view layout: footprint-aware full rings, split when one circle is too tight.
 */
export function packFullRings(
  devices: Device[],
  startRadius: number,
): {
  slots: { radius: number; angle: number }[]
  rings: { radius: number }[]
} {
  if (devices.length === 0) {
    return { slots: [], rings: [{ radius: startRadius }] }
  }

  const rows = splitRows(devices, ringsForCircle(devices, startRadius))
  const packed: { radius: number; slots: { radius: number; angle: number }[] }[] =
    []

  let minR = startRadius
  rows.forEach((row, i) => {
    const stagger = i % 2 === 1 ? ALL_GAP / (2 * Math.max(minR, 1)) : 0
    const ring = packOnCircle(row, minR, stagger)
    packed.push(ring)
    const clear = Math.max(...row.map(radialClearance), 0.35)
    minR = ring.radius + clear + ALL_RADIAL_GAP
  })

  return {
    slots: packed.flatMap((row) => row.slots),
    rings: packed.map((row) => ({ radius: row.radius })),
  }
}

function faceInward(angle: number): number {
  return -angle + Math.PI / 2
}

function placeOnCircle(
  device: Device,
  radius: number,
  angle: number,
): ShowroomPlacement {
  return {
    device,
    position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
    rotationY: faceInward(angle),
  }
}

export function layoutByCategory(
  devices: Device[],
  filter: Category | 'all',
): ShowroomLayout {
  const useCompactArc = filter !== 'all'
  const rings: ShowroomRing[] = []
  const placements: ShowroomPlacement[] = []
  let baseRadius = useCompactArc ? 2.4 : ALL_INNER_RADIUS

  for (const cat of CATEGORY_ORDER) {
    const inCat = devices.filter((d) => d.category === cat)
    if (inCat.length === 0) continue

    if (useCompactArc) {
      const compact = compactSlots(inCat)
      compact.rings.forEach((ring, i) => {
        rings.push({
          category: cat,
          radius: ring.radius,
          labelPosition: [0, 0.03, 0.72],
          thetaStart: ring.thetaStart,
          thetaLength: ring.thetaLength,
          showLabel: i === 0,
        })
      })
      inCat.forEach((d, i) => {
        const slot = compact.slots[i]
        if (!slot) return
        placements.push(placeOnCircle(d, slot.radius, slot.angle))
      })
      continue
    }

    const packed = packFullRings(inCat, baseRadius)
    packed.rings.forEach((ring, i, arr) => {
      rings.push({
        category: cat,
        radius: ring.radius,
        labelPosition: [ring.radius + 0.75, 0.03, 0],
        thetaStart: 0,
        thetaLength: TAU,
        showLabel: i === arr.length - 1,
      })
    })
    inCat.forEach((d, i) => {
      const slot = packed.slots[i]
      if (!slot) return
      placements.push(placeOnCircle(d, slot.radius, slot.angle))
    })
    const last = packed.rings[packed.rings.length - 1]
    const lastRow = splitRows(inCat, packed.rings.length).at(-1) ?? inCat
    const clear = Math.max(...lastRow.map(radialClearance), 0.35)
    baseRadius = (last?.radius ?? baseRadius) + clear + ALL_CATEGORY_GAP
  }

  return { rings, placements }
}

export function placementBounds(placements: ShowroomPlacement[]) {
  if (placements.length === 0) {
    return { width: 2, depth: 2, maxZ: 1, span: 2, maxR: 2 }
  }

  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  let maxR = 0

  for (const p of placements) {
    const [x, , z] = p.position
    const plane = estimateBillboardPlane(p.device)
    minX = Math.min(minX, x - plane.planeW * 0.45)
    maxX = Math.max(maxX, x + plane.planeW * 0.45)
    minZ = Math.min(minZ, z)
    maxZ = Math.max(maxZ, z)
    maxR = Math.max(maxR, Math.hypot(x, z) + plane.footprint * 0.35)
  }

  const width = Math.max(1.1, maxX - minX)
  const depth = Math.max(0.8, maxZ - minZ)
  return { width, depth, maxZ, span: Math.max(width, depth), maxR }
}
