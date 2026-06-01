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

export function devicesForVendor(
  vendor: VendorId | 'all',
): Device[] {
  if (vendor === 'all') return DEVICES
  return DEVICES.filter((d) => d.vendorId === vendor)
}
