import { CISCO_DEVICES } from './vendors/cisco'
import { LOGITECH_DEVICES } from './vendors/logitech'
import { POLY_DEVICES } from './vendors/poly'
import { NEAT_DEVICES } from './vendors/neat'
import type { Device, VendorId } from './types'

export const DEVICES: Device[] = [
  ...CISCO_DEVICES,
  ...LOGITECH_DEVICES,
  ...POLY_DEVICES,
  ...NEAT_DEVICES,
]

export const DEVICES_BY_ID = new Map(DEVICES.map((d) => [d.id, d]))

/** Stable vendor order for URL params and UI toggles. */
const VENDOR_ORDER_DEFAULT: VendorId[] = [
  'cisco',
  'logitech',
  'poly',
  'neat',
]

export function normalizeVendorSelection(
  vendors: readonly VendorId[],
  order: readonly VendorId[] = VENDOR_ORDER_DEFAULT,
): VendorId[] {
  const want = new Set(vendors)
  const out: VendorId[] = []
  for (const id of order) {
    if (want.has(id)) out.push(id)
  }
  return out.length > 0 ? out : [order[0]]
}

export function devicesForVendors(vendors: readonly VendorId[]): Device[] {
  const set = new Set(vendors)
  return DEVICES.filter((d) => set.has(d.vendorId))
}

/** @deprecated Use devicesForVendors — single vendor or literal `all`. */
export function devicesForVendor(vendor: VendorId | 'all'): Device[] {
  if (vendor === 'all') return DEVICES
  return devicesForVendors([vendor])
}
