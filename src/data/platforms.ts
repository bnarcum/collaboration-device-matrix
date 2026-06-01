import type { Device } from './types'

export type MeetingPlatformId = 'teams' | 'zoom' | 'google' | 'webex'

export const MEETING_PLATFORM_LABELS: Record<MeetingPlatformId, string> = {
  teams: 'Microsoft Teams',
  zoom: 'Zoom',
  google: 'Google Meet',
  webex: 'Webex',
}

export const MEETING_PLATFORM_ORDER: MeetingPlatformId[] = [
  'teams',
  'zoom',
  'google',
  'webex',
]

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

/** Infer room/UC platform support from catalog text (software, highlights, tagline). */
export function meetingPlatformSupport(
  d: Device,
): Record<MeetingPlatformId, string> {
  const text = deviceCorpus(d)
  const isCisco = d.vendorId === 'cisco'

  const teams =
    /teams rooms|microsoft teams rooms|teams on android|teams \(vimt|teams phone|microsoft teams(?!\s+workspace)/i.test(
      text,
    ) ||
    (/microsoft teams/i.test(text) && !/workspace/i.test(text))
  const teamsPartial =
    !teams &&
    (/teams|vimt\/cvi/i.test(text) || d.category === 'phone' || d.category === 'headset')

  const zoom =
    /zoom rooms|zoom for cisco|zoom \(sip\)/i.test(text) ||
    (/zoom rooms certified|native teams and zoom/i.test(text) && /zoom/i.test(text))
  const zoomPartial =
    !zoom && (/zoom phone|zoom(?!\s+rooms)/i.test(text) || /\bzoom\b/i.test(text))

  const google =
    /google meet|google workspace/i.test(text) ||
    (/google/i.test(text) && /meet/i.test(text))
  const googlePartial = !google && /google/i.test(text)

  const webex =
    isCisco ||
    /\bwebex\b/i.test(text) ||
    /roomos/i.test(text) ||
    /cisco meeting/i.test(text)
  const webexPartial = !webex && isCisco

  const cell = (yes: boolean, partial: boolean, partialLabel = 'Partial') => {
    if (yes) return 'Yes'
    if (partial) return partialLabel
    return '—'
  }

  return {
    teams: cell(teams, teamsPartial, 'App / device'),
    zoom: cell(zoom, zoomPartial, 'App / device'),
    google: cell(google, googlePartial, 'Listed'),
    webex: cell(webex, webexPartial && isCisco, 'Native'),
  }
}

export function formatMeetingPlatforms(d: Device): string {
  return MEETING_PLATFORM_ORDER.map((id) => {
    const v = meetingPlatformSupport(d)[id]
    if (v === '—') return null
    const short = id === 'google' ? 'Meet' : MEETING_PLATFORM_LABELS[id].split(' ').pop()
    return `${short}: ${v}`
  })
    .filter(Boolean)
    .join(' · ')
}
