/**
 * Tron: Legacy showroom aesthetic — set to `false` to revert to celestial stage look.
 * Toggle only this flag (or `?tron=0` / `?tron=1` URL override) to A/B the theme.
 */
export const TRON_SHOWROOM_DEFAULT = true

export const TRON = {
  cyan: '#00fff0',
  cyanDim: '#02C8FF',
  orange: '#ff6600',
  void: '#000000',
  floor: '#020408',
  gridMajor: '#00fff0',
  gridMinor: '#0a2840',
} as const

export function resolveTronShowroom(): boolean {
  if (typeof window === 'undefined') return TRON_SHOWROOM_DEFAULT
  const raw = new URLSearchParams(window.location.search).get('tron')
  if (raw === '0' || raw === 'false') return false
  if (raw === '1' || raw === 'true') return true
  return TRON_SHOWROOM_DEFAULT
}
