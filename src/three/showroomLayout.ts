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
  /** Height of this orbit above the floor (stacked All-view mock). */
  elevation?: number
  /** World-space floor label, outside the rotated ring mesh. */
  labelPosition: [number, number, number]
  thetaStart: number
  thetaLength: number
  showLabel: boolean
}

export interface ShowroomLayout {
  rings: ShowroomRing[]
  placements: ShowroomPlacement[]
  /** Category islands / row captions for Hub and Wall mocks. */
  markers?: ShowroomMarker[]
}

export interface ShowroomMarker {
  category: Category
  count: number
  position: [number, number, number]
}

export type ShowroomAllMode = 'floor' | 'layers' | 'hub' | 'wall'

/** Uniform scale for the camera-facing product wall so ~120 SKUs fit one frame. */
export const WALL_PEDESTAL_SCALE = 0.62

/** Mobile category shelf — keeps SKUs readable without matching the All-view wall mock. */
export const MOBILE_SHELF_SCALE = 1

/** Gap between billboard footprints along a filtered arc (meters). */
const COMPACT_GAP = 0.32

/** Front-facing horseshoe, opening toward +Z (camera). */
export const ARC_SWEEP = (168 * Math.PI) / 180
export const ARC_CENTER = -Math.PI / 2

const MIN_ARC_RADIUS = 1.15
const TWO_ROW_COUNT = 12
const TWO_ROW_RADIUS = 2.7
const THREE_ROW_COUNT = 28
const THREE_ROW_RADIUS = 5.0
const ROW_GAP = 0.52

function fullRingAngles(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i / count) * Math.PI * 2)
}

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

function rowCountFor(devices: Device[], compactRows = false): number {
  const n = devices.length
  if (n <= 1) return 1

  // Portrait cannot frame a wide 3-row horseshoe; split fat categories tighter.
  if (compactRows) {
    if (n <= 8) return 1
    if (n <= 16) return 2
    if (n <= 24) return 3
    if (n <= 36) return 4
    return 5
  }

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
export function compactSlots(
  devices: Device[],
  compactRows = false,
): {
  slots: { radius: number; angle: number }[]
  rings: { radius: number; thetaStart: number; thetaLength: number }[]
} {
  const theta = arcRingTheta()
  if (devices.length === 0) {
    return { slots: [], rings: [{ radius: MIN_ARC_RADIUS, ...theta }] }
  }

  const rows = splitRows(devices, rowCountFor(devices, compactRows))
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

function faceInward(angle: number): number {
  return -angle + Math.PI / 2
}

function placeOnCircle(
  device: Device,
  radius: number,
  angle: number,
  y = 0,
): ShowroomPlacement {
  return {
    device,
    position: [Math.cos(angle) * radius, y, Math.sin(angle) * radius],
    rotationY: faceInward(angle),
  }
}

function chunkDevices(devices: Device[], size: number): Device[][] {
  const out: Device[][] = []
  for (let i = 0; i < devices.length; i += size) {
    out.push(devices.slice(i, i + size))
  }
  return out
}

function layerCap(category: Category): number {
  if (category === 'room') return 11
  if (category === 'phone') return 15
  if (category === 'headset') return 12
  return 14
}

function layerRise(devices: Device[]): number {
  const h = Math.max(
    ...devices.map((d) => estimateBillboardPlane(d).planeH),
    0.3,
  )
  return Math.max(1.05, h * 0.62 + 0.85)
}

/**
 * Mock All-view: each category is one or more full orbits stacked in Y,
 * slightly stepped inward like an amphitheater so upper layers stay readable.
 */
export function layoutStackedLayers(devices: Device[]): ShowroomLayout {
  const rings: ShowroomRing[] = []
  const placements: ShowroomPlacement[] = []
  let y = 0

  CATEGORY_ORDER.forEach((cat, catIndex) => {
    const inCat = devices.filter((d) => d.category === cat)
    if (inCat.length === 0) return

    const rows = chunkDevices(inCat, layerCap(cat))
    rows.forEach((row, rowIndex) => {
      const radius = Math.max(3.4, 8.2 - catIndex * 0.7 - rowIndex * 0.12)
      const stagger = (catIndex * 0.19 + rowIndex * Math.PI / Math.max(row.length, 1))
      const step = (Math.PI * 2) / row.length

      row.forEach((d, i) => {
        placements.push(placeOnCircle(d, radius, stagger + i * step, y))
      })

      rings.push({
        category: cat,
        radius,
        elevation: y,
        labelPosition: [radius + 0.85, 0.18, 0],
        thetaStart: 0,
        thetaLength: Math.PI * 2,
        showLabel: rowIndex === 0,
      })

      y += layerRise(row)
    })
    y += 0.28
  })

  return { rings, placements }
}

function pickHero(devices: Device[]): Device {
  const cisco = devices.filter((d) => d.vendorId === 'cisco')
  const pool = cisco.length > 0 ? cisco : devices
  return pool.reduce((best, d) =>
    deviceFootprint(d) >= deviceFootprint(best) ? d : best,
  )
}

/**
 * Mock All-view: one hero per category on a 2×3 floor, with a count label.
 * Clicking an island should enter that category's horseshoe.
 */
export function layoutCategoryHub(devices: Device[]): ShowroomLayout {
  const placements: ShowroomPlacement[] = []
  const markers: ShowroomMarker[] = []
  const colX = [-3.7, 0, 3.7]
  const rowZ = [-1.85, 2.05]
  let slot = 0

  for (const cat of CATEGORY_ORDER) {
    const inCat = devices.filter((d) => d.category === cat)
    if (inCat.length === 0) continue
    const col = slot % 3
    const row = Math.floor(slot / 3)
    slot += 1
    const x = colX[col] ?? 0
    const z = rowZ[row] ?? 0
    const hero = pickHero(inCat)
    placements.push({
      device: hero,
      position: [x, 0, z],
      rotationY: 0,
    })
    markers.push({
      category: cat,
      count: inCat.length,
      position: [x, 0.04, z + 0.95],
    })
  }

  return { rings: [], placements, markers }
}

/**
 * Mock All-view: camera-facing grid, one band per category, slight cylindrical
 * curve so the wall reads as a shop display instead of a flat poster.
 */
export function layoutProductWall(devices: Device[]): ShowroomLayout {
  const placements: ShowroomPlacement[] = []
  const markers: ShowroomMarker[] = []
  let y = 0

  for (const cat of CATEGORY_ORDER) {
    const inCat = devices.filter((d) => d.category === cat)
    if (inCat.length === 0) continue

    const perRow =
      cat === 'room' ? 10 : cat === 'phone' ? 14 : cat === 'headset' ? 12 : 11
    const rows = chunkDevices(inCat, perRow)
    const bandTop = y
    let bandMinX = 0

    rows.forEach((row, rowIndex) => {
      const widths = row.map((d) => {
        const plane = estimateBillboardPlane(d, WALL_PEDESTAL_SCALE)
        return Math.max(plane.planeW, 0.28) + 0.22
      })
      const total = widths.reduce((s, w) => s + w, 0)
      let cursor = -total / 2
      if (rowIndex === 0) bandMinX = cursor
      const rowH = Math.max(
        ...row.map((d) => estimateBillboardPlane(d, WALL_PEDESTAL_SCALE).planeH),
        0.28,
      )

      row.forEach((d, i) => {
        const w = widths[i] ?? 0.7
        const x = cursor + w / 2
        cursor += w
        const z = -0.028 * x * x
        placements.push({
          device: d,
          position: [x, y, z],
          rotationY: -x * 0.03,
        })
      })

      y += rowH * 0.7 + 0.36
    })

    const bandMid = (bandTop + y) * 0.5
    markers.push({
      category: cat,
      count: inCat.length,
      position: [bandMinX - 1.15, bandMid, 0.15],
    })
    y += 0.32
  }

  return { rings: [], placements, markers }
}

function shelfColumns(count: number): number {
  if (count <= 3) return count
  if (count <= 8) return 3
  if (count <= 28) return 4
  return 5
}

/**
 * Portrait category view: camera-facing shelf so every SKU sits in the
 * frustum. Desktop filtered view stays on the horseshoe (compactSlots).
 */
export function layoutFacingShelf(
  devices: Device[],
  category: Category,
  pedestalScale = MOBILE_SHELF_SCALE,
): ShowroomLayout {
  const n = devices.length
  if (n === 0) return { rings: [], placements: [], markers: [] }

  const cols = shelfColumns(n)
  const rows = Math.ceil(n / cols)
  const planes = devices.map((d) => estimateBillboardPlane(d, pedestalScale))
  const cellW = Math.max(
    ...planes.map((p) => p.planeW),
    0.36,
  ) + 0.28
  const cellH = Math.max(
    ...planes.map((p) => p.planeH),
    0.32,
  ) + 0.55

  const placements: ShowroomPlacement[] = devices.map((device, i) => {
    const row = Math.floor(i / cols)
    const col = i % cols
    const inRow = Math.min(cols, n - row * cols)
    const x = (col - (inRow - 1) / 2) * cellW
    const y = (rows - 1 - row) * cellH
    const z = -0.016 * x * x
    return {
      device,
      position: [x, y, z],
      rotationY: 0,
    }
  })

  return {
    rings: [],
    placements,
    markers: [
      {
        category,
        count: n,
        position: [0, -0.52, 0.22],
      },
    ],
  }
}

export function layoutByCategory(
  devices: Device[],
  filter: Category | 'all',
  options?: {
    stacked?: boolean
    allMode?: ShowroomAllMode
    /** Extra horseshoe rows so a portrait camera can see every SKU. */
    compactRows?: boolean
    /** Portrait category: facing shelf instead of concentric horseshoes. */
    facingShelf?: boolean
  },
): ShowroomLayout {
  const allMode = options?.allMode ?? (options?.stacked ? 'layers' : 'floor')
  if (filter === 'all' && allMode === 'layers') {
    return layoutStackedLayers(devices)
  }
  if (filter === 'all' && allMode === 'hub') {
    return layoutCategoryHub(devices)
  }
  if (filter === 'all' && allMode === 'wall') {
    return layoutProductWall(devices)
  }
  if (filter !== 'all' && options?.facingShelf) {
    return layoutFacingShelf(
      devices.filter((d) => d.category === filter),
      filter,
    )
  }
  const useCompactArc = filter !== 'all'
  const rings: ShowroomRing[] = []
  const placements: ShowroomPlacement[] = []
  let baseRadius = 2.4

  for (const cat of CATEGORY_ORDER) {
    const inCat = devices.filter((d) => d.category === cat)
    if (inCat.length === 0) continue

    if (useCompactArc) {
      const compact = compactSlots(inCat, options?.compactRows === true)
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

    const radius = baseRadius
    const angles = fullRingAngles(inCat.length)
    rings.push({
      category: cat,
      radius,
      labelPosition: [radius + 0.55, 0.03, 0],
      thetaStart: 0,
      thetaLength: Math.PI * 2,
      showLabel: true,
    })
    inCat.forEach((d, i) => {
      placements.push(placeOnCircle(d, radius, angles[i] ?? 0))
    })
    baseRadius += 2.0
  }

  return { rings, placements }
}

export function placementBounds(placements: ShowroomPlacement[]) {
  if (placements.length === 0) {
    return { width: 2, depth: 2, height: 2, maxZ: 1, span: 2 }
  }

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity

  for (const p of placements) {
    const [x, y, z] = p.position
    const plane = estimateBillboardPlane(p.device)
    minX = Math.min(minX, x - plane.planeW * 0.45)
    maxX = Math.max(maxX, x + plane.planeW * 0.45)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y + plane.planeH)
    minZ = Math.min(minZ, z)
    maxZ = Math.max(maxZ, z)
  }

  const width = Math.max(1.1, maxX - minX)
  const depth = Math.max(0.8, maxZ - minZ)
  const height = Math.max(0.8, maxY - minY)
  return { width, depth, height, maxZ, span: Math.max(width, depth, height) }
}
