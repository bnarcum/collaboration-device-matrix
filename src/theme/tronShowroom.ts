/**
 * Tron: Legacy showroom easter egg — off by default.
 * Enable: triple-click the title · `?tron=1` · session persists toggle.
 */
export const TRON_SHOWROOM_DEFAULT = false

export const TRON_SESSION_KEY = 'matrix-tron-showroom'

export const TRON = {
  cyan: '#00fff0',
  cyanDim: '#02C8FF',
  orange: '#ff6600',
  void: '#000000',
  floor: '#020408',
  gridMajor: '#00fff0',
  gridMinor: '#0a2840',
} as const

let tronUserPref: boolean | null = null

function readSessionPref(): boolean | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(TRON_SESSION_KEY)
    if (raw === '1') return true
    if (raw === '0') return false
  } catch {
    /* ignore */
  }
  return null
}

function writeSessionPref(on: boolean) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(TRON_SESSION_KEY, on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

/** Sync module state (call from React provider on mount/toggle). */
export function setTronShowroomActive(on: boolean) {
  tronUserPref = on
  writeSessionPref(on)
}

export function initTronShowroomFromSession(): boolean {
  const session = readSessionPref()
  if (session !== null) tronUserPref = session
  return resolveTronShowroom()
}

export function resolveTronShowroom(): boolean {
  if (typeof window === 'undefined') return TRON_SHOWROOM_DEFAULT
  const url = new URLSearchParams(window.location.search).get('tron')
  if (url === '0' || url === 'false') return false
  if (url === '1' || url === 'true') return true
  if (tronUserPref !== null) return tronUserPref
  const session = readSessionPref()
  if (session !== null) return session
  return TRON_SHOWROOM_DEFAULT
}
