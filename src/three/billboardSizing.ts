import type { Device } from '../data/types'
import { devicePhotoAspect } from '../data/deviceImages'

/** Scale factor applied to catalog display width/height when fitting photos. */
export const DISPLAY_FIT = 0.9

export function devicePhotoScale(device: Device): number {
  return device.photoScale ?? 1
}

export interface BillboardPlane {
  planeW: number
  planeH: number
  /** Max edge — used for shadows, selection pool, and label height. */
  footprint: number
}

/**
 * Fit a product photo to physical display dimensions from the catalog.
 * Landscape photos anchor on display width; portrait photos anchor on height
 * so tall stand shots (e.g. Neat Board) match Cisco board scale.
 */
export function computeBillboardPlane(
  displayWidth: number,
  displayHeight: number,
  imageAspect: number,
  options?: { photoScale?: number; pedestalScale?: number },
): BillboardPlane {
  const photoScale = options?.photoScale ?? 1
  const pedestalScale = options?.pedestalScale ?? 1
  const k = DISPLAY_FIT * photoScale * pedestalScale

  let planeW: number
  let planeH: number
  if (imageAspect >= 1) {
    planeW = displayWidth * k
    planeH = planeW / imageAspect
  } else {
    planeH = displayHeight * k
    planeW = planeH * imageAspect
  }

  return { planeW, planeH, footprint: Math.max(planeW, planeH) }
}

/** Footprint estimate before the texture finishes loading. */
export function estimateBillboardPlane(
  device: Device,
  pedestalScale = 1,
): BillboardPlane {
  const aspect = devicePhotoAspect(device.id) ?? 1
  return computeBillboardPlane(device.size[0], device.size[1], aspect, {
    photoScale: devicePhotoScale(device),
    pedestalScale,
  })
}

/** Aisle tall-shelf img-wrap dimensions (must match index.css). */
export const AISLE_TALL_IMG_WRAP = { width: 260, height: 460 } as const

/** Reference board for cross-vendor aisle scale (75" Cisco Board Pro G2). */
const AISLE_REF_BOARD = {
  displayWidth: 1.7,
  displayHeight: 1.05,
  aspect: 1.5097,
} as const

export interface AisleImageRatios {
  /** Rendered height as a fraction of the img-wrap height (0–1). */
  heightRatio: number
  /** Rendered width as a fraction of the img-wrap width (0–1). */
  widthRatio: number
}

/**
 * Fit a product photo in the aisle tall shelf using the same display-width /
 * display-height rules as 3D billboards, then map plane size to CSS pixels.
 */
export function aisleProductImageRatios(device: Device): AisleImageRatios {
  const aspect = devicePhotoAspect(device.id) ?? 1
  const { planeW, planeH } = computeBillboardPlane(
    device.size[0],
    device.size[1],
    aspect,
    { photoScale: devicePhotoScale(device) },
  )

  const refPlane = computeBillboardPlane(
    AISLE_REF_BOARD.displayWidth,
    AISLE_REF_BOARD.displayHeight,
    AISLE_REF_BOARD.aspect,
  )

  const { width: wrapW, height: wrapH } = AISLE_TALL_IMG_WRAP
  const pxPerUnit = wrapW / refPlane.planeW

  let renderW = planeW * pxPerUnit
  let renderH = planeH * pxPerUnit

  if (renderW > wrapW) {
    renderW = wrapW
    renderH = renderW / aspect
  }
  if (renderH > wrapH) {
    renderH = wrapH
    renderW = renderH * aspect
  }

  return {
    heightRatio: renderH / wrapH,
    widthRatio: renderW / wrapW,
  }
}

/** @deprecated Use aisleProductImageRatios — kept for callers migrating gradually. */
export function aisleImageHeightRatio(device: Device): number {
  return aisleProductImageRatios(device).heightRatio
}
