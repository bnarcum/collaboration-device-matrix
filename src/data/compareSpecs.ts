import type { Device } from './types'

const NA = '—'

/** Category-aware compare cell so partner rows align with Cisco spec depth. */
export function compareDisplay(d: Device): string {
  if (d.display) return d.display
  if (d.category === 'camera') return 'N/A (camera-only)'
  if (d.category === 'phone' || d.category === 'headset')
    return 'N/A (no integrated display)'
  if (d.category === 'peripheral' && d.shape === 'navigator')
    return d.formFactor.includes('touch') ? 'See form factor' : NA
  return NA
}

export function compareCamera(d: Device): string {
  if (d.camera) return d.camera
  if (d.category === 'phone' || d.category === 'headset')
    return 'N/A (voice device)'
  if (d.category === 'peripheral') return 'N/A (peripheral)'
  return NA
}

export function compareAudio(d: Device): string {
  if (d.audio) return d.audio
  if (d.category === 'camera') return 'N/A (camera-only)'
  if (d.shape === 'navigator') return 'N/A (control surface)'
  return NA
}

export function compareConnectivity(d: Device): string {
  if (d.connectivity?.length) return d.connectivity.join(', ')
  return NA
}

export function compareSoftware(d: Device): string {
  if (d.software?.length) return d.software.join(', ')
  if (d.vendorId === 'cisco') return 'RoomOS (see datasheet)'
  return NA
}
