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

/** Relative display height for 2D aisle tiles (boards / tall desk devices). */
export function aisleImageHeightRatio(device: Device): number {
  const refHeight = 1.05
  return (device.size[1] / refHeight) * devicePhotoScale(device)
}
