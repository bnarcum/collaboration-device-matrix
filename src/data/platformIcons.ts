import type { MeetingPlatformId } from './types'

const base = `${import.meta.env.BASE_URL ?? '/'}platform-icons/`

/** Current official app icons (PNG, 256–512px source). */
export const PLATFORM_ICON_SRC: Record<MeetingPlatformId, string> = {
  webex: `${base}webex.png`,
  teams: `${base}teams.png`,
  zoom: `${base}zoom.png`,
  google: `${base}google-meet.png`,
}
