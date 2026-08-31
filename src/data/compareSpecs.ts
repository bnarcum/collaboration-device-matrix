import type { Device } from './types'

const NA = '—'

/** Category-aware compare cell so partner rows align with Cisco spec depth. */
export function compareDisplay(d: Device): string {
  if (d.display) return d.display
  if (d.category === 'camera') return 'N/A (camera-only)'
  if (d.category === 'headset') return 'N/A (headset)'
  if (d.shape === 'kem') return 'See form factor'
  if (d.category === 'peripheral' && d.shape === 'navigator')
    return d.formFactor.includes('touch') ? 'See form factor' : NA
  return NA
}

export function compareCamera(d: Device): string {
  if (d.camera) return d.camera
  if (d.id.includes('8875') || /video phone/i.test(d.name))
    return 'Integrated HD camera'
  if (d.category === 'headset') return 'N/A (headset)'
  if (d.category === 'phone') return 'No camera'
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
  if (d.category === 'phone' || d.category === 'headset') {
    if (d.family.includes('9800')) return 'PhoneOS'
    return 'SIP / multiplatform firmware'
  }
  if (d.vendorId === 'cisco') return 'RoomOS (see datasheet)'
  return NA
}
