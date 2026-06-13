import { CISCO_DEVICE_PLATFORMS } from './ciscoPlatforms'
import type {
  Device,
  DevicePlatforms,
  MeetingPlatformId,
  PlatformSupportLevel,
} from './types'

export type { MeetingPlatformId, PlatformSupportLevel, DevicePlatforms }

export const MEETING_PLATFORM_LABELS: Record<MeetingPlatformId, string> = {
  webex: 'Webex (RoomOS)',
  teams: 'Microsoft Teams Rooms',
  zoom: 'Zoom',
  google: 'Google Meet',
}

/** Shorter labels for the topbar platform switch. */
export const MEETING_PLATFORM_SHORT_LABELS: Record<MeetingPlatformId, string> = {
  webex: 'Webex',
  teams: 'Teams Rooms',
  zoom: 'Zoom',
  google: 'Google Meet',
}

export const MEETING_PLATFORM_ORDER: MeetingPlatformId[] = [
  'webex',
  'teams',
  'zoom',
  'google',
]

export const PLATFORM_LEVEL_LABELS: Record<PlatformSupportLevel, string> = {
  native: 'Native (RoomOS / Webex)',
  mtr: 'Teams Rooms native (MDEP)',
  'teams-panel': 'Teams Panel',
  'teams-console': 'Teams Rooms Console',
  vimt: 'Teams interop (VIMT/CVI)',
  'zoom-native': 'Zoom app (guest & signed-in)',
  'zoom-sip': 'Zoom SIP / CRC interop',
  guest: 'Guest join',
  app: 'Client app (phone / headset / USB)',
}

/** Levels that match a primary platform filter toggle (no interop). */
const PRIMARY_FILTER_LEVELS: Record<
  MeetingPlatformId,
  readonly PlatformSupportLevel[]
> = {
  webex: ['native'],
  teams: ['mtr', 'teams-panel', 'teams-console'],
  zoom: ['zoom-native'],
  google: ['guest'],
}

/** Additional levels when “Include interop & apps” is on. */
const INTEROP_FILTER_LEVELS: Record<
  MeetingPlatformId,
  readonly PlatformSupportLevel[]
> = {
  webex: [],
  teams: ['vimt', 'app'],
  zoom: ['zoom-sip', 'app'],
  google: ['app'],
}

function deviceCorpus(d: Device): string {
  return [
    ...(d.software ?? []),
    ...(d.highlights ?? []),
    d.tagline,
    d.formFactor,
    ...(d.connectivity ?? []),
    ...(d.useCases ?? []),
  ]
    .join(' ')
    .toLowerCase()
}

/** Resolve structured platforms: device field → Cisco map → text inference. */
export function devicePlatforms(d: Device): DevicePlatforms {
  if (d.platforms && Object.keys(d.platforms).length > 0) return d.platforms
  if (d.vendorId === 'cisco' && CISCO_DEVICE_PLATFORMS[d.id]) {
    return CISCO_DEVICE_PLATFORMS[d.id]
  }
  return inferPlatformsFromText(d)
}

function inferPlatformsFromText(d: Device): DevicePlatforms {
  const text = deviceCorpus(d)
  const out: DevicePlatforms = {}

  if (d.vendorId === 'cisco' || /\bwebex\b/i.test(text) || /roomos/i.test(text)) {
    out.webex = 'native'
  }

  if (/teams rooms|microsoft teams rooms|teams on android/i.test(text)) {
    out.teams = 'mtr'
  } else if (/teams \(vimt|vimt\/cvi/i.test(text)) {
    out.teams = 'vimt'
  } else if (/microsoft teams|teams phone/i.test(text)) {
    out.teams = 'app'
  }

  if (/zoom for cisco|zoom rooms/i.test(text)) {
    out.zoom = 'zoom-native'
  } else if (/zoom \(sip\)/i.test(text)) {
    out.zoom = 'zoom-sip'
  } else if (/\bzoom\b/i.test(text)) {
    out.zoom = 'app'
  }

  if (/google meet \(guest\)/i.test(text)) {
    out.google = 'guest'
  } else if (/google meet|google workspace/i.test(text)) {
    out.google = 'app'
  }

  return out
}

export function platformLevelLabel(level: PlatformSupportLevel): string {
  return PLATFORM_LEVEL_LABELS[level]
}

/** Human-readable compare / drawer cell for one platform. */
export function platformSupportLabel(
  d: Device,
  platformId: MeetingPlatformId,
): string {
  const level = devicePlatforms(d)[platformId]
  if (!level) return '—'
  return PLATFORM_LEVEL_LABELS[level]
}

export function deviceMatchesPlatformFilter(
  d: Device,
  selected: readonly MeetingPlatformId[],
  includeInterop: boolean,
): boolean {
  if (selected.length === 0) return true
  const platforms = devicePlatforms(d)
  for (const id of selected) {
    const level = platforms[id]
    if (!level) continue
    const allowed = includeInterop
      ? [...PRIMARY_FILTER_LEVELS[id], ...INTEROP_FILTER_LEVELS[id]]
      : PRIMARY_FILTER_LEVELS[id]
    if ((allowed as readonly PlatformSupportLevel[]).includes(level)) {
      return true
    }
  }
  return false
}

/** @deprecated Prefer platformSupportLabel — kept for compare row compatibility. */
export function meetingPlatformSupport(
  d: Device,
): Record<MeetingPlatformId, string> {
  const platforms = devicePlatforms(d)
  const out = {} as Record<MeetingPlatformId, string>
  for (const id of MEETING_PLATFORM_ORDER) {
    const level = platforms[id]
    out[id] = level ? PLATFORM_LEVEL_LABELS[level] : '—'
  }
  return out
}

export function formatMeetingPlatforms(d: Device): string {
  return MEETING_PLATFORM_ORDER.map((id) => {
    const label = platformSupportLabel(d, id)
    if (label === '—') return null
    const short =
      id === 'google' ? 'Meet' : MEETING_PLATFORM_SHORT_LABELS[id]
    return `${short}: ${label}`
  })
    .filter(Boolean)
    .join(' · ')
}

export function filterDevicesByPlatform(
  devices: readonly Device[],
  selected: readonly MeetingPlatformId[],
  includeInterop: boolean,
): Device[] {
  if (selected.length === 0) return [...devices]
  return devices.filter((d) =>
    deviceMatchesPlatformFilter(d, selected, includeInterop),
  )
}
