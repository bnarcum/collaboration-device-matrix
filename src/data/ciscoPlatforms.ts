import type { DevicePlatforms } from './types'

/** Official sources for Cisco meeting-platform certification lists. */
export const PLATFORM_SOURCE_URLS = {
  teamsMtr:
    'https://www.webex.com/us/en/solutions/microsoft-teams-rooms-cisco-devices.html',
  zoomNative:
    'https://help.webex.com/en-us/article/zai3j4/Enable-Zoom-Meetings-on-Board,-Desk,-and-Room-Series',
  zoomJoin:
    'https://help.webex.com/article/0lobg6/join-zoom-meetings-on-board',
} as const

/**
 * Structured platform support for Cisco catalog devices.
 * Room/desk IDs sourced from Webex MTR and Zoom app-experience allowlists.
 */
export const CISCO_DEVICE_PLATFORMS: Readonly<Record<string, DevicePlatforms>> = {
  // ── Room — MTR + native Zoom app ──
  'board-pro-g2-55': {
    webex: 'native',
    teams: 'mtr',
    zoom: 'zoom-native',
    google: 'guest',
  },
  'board-pro-g2-75': {
    webex: 'native',
    teams: 'mtr',
    zoom: 'zoom-native',
    google: 'guest',
  },
  'room-bar': {
    webex: 'native',
    teams: 'mtr',
    zoom: 'zoom-native',
    google: 'guest',
  },
  'room-bar-pro': {
    webex: 'native',
    teams: 'mtr',
    zoom: 'zoom-native',
    google: 'guest',
  },
  'room-kit-eq': {
    webex: 'native',
    teams: 'mtr',
    zoom: 'zoom-native',
    google: 'guest',
  },
  'room-kit-eqx': {
    webex: 'native',
    teams: 'mtr',
    zoom: 'zoom-native',
    google: 'guest',
  },
  'room-kit-pro-g2': {
    webex: 'native',
    teams: 'mtr',
    zoom: 'zoom-native',
    google: 'guest',
  },

  // ── Desk — MTR display + native Zoom on Desk Pro G2 ──
  'desk-pro-g2': {
    webex: 'native',
    teams: 'mtr',
    zoom: 'zoom-native',
    google: 'guest',
  },

  // ── Desk — interop only (VIMT / SIP) ──
  desk: {
    webex: 'native',
    teams: 'vimt',
    zoom: 'zoom-sip',
    google: 'guest',
  },
  'desk-mini': {
    webex: 'native',
    teams: 'vimt',
    zoom: 'zoom-sip',
    google: 'guest',
  },

  // ── BYOD bar — RoomOS, meetings via connected laptop ──
  'room-bar-byod': {
    webex: 'native',
  },

  // ── Teams panel / console accessories ──
  'room-navigator-wall': {
    webex: 'native',
    teams: 'teams-panel',
  },
  'room-navigator-table': {
    webex: 'native',
    teams: 'teams-console',
  },

  // ── Phones — UC apps (not Teams Rooms) ──
  'video-phone-8875': { webex: 'app', teams: 'app', zoom: 'app' },
  'desk-phone-9871': { webex: 'app', teams: 'app', zoom: 'app' },
  'desk-phone-9841': { webex: 'app', teams: 'app', zoom: 'app' },
  'conference-8832': { webex: 'app', teams: 'app', zoom: 'app' },
  'wireless-9821': { webex: 'app', teams: 'app', zoom: 'app' },
  'wireless-860': { webex: 'app', teams: 'app', zoom: 'app' },
  'dect-6825': { webex: 'app', teams: 'app', zoom: 'app' },

  // ── Headsets — UC apps ──
  'headset-320': { webex: 'app', teams: 'app', zoom: 'app' },
  'headset-520': { webex: 'app', teams: 'app', zoom: 'app' },
  'headset-560': { webex: 'app', teams: 'app', zoom: 'app' },
  'headset-730': { webex: 'app', teams: 'app', zoom: 'app' },
  'headset-bang-olufsen-900': { webex: 'app', teams: 'app', zoom: 'app' },
  'headset-950': { webex: 'app', teams: 'app', zoom: 'app' },

  // ── Room peripherals — Webex room ecosystem ──
  'table-mic-pro': { webex: 'native' },
  'ceiling-mic-pro': { webex: 'native' },
  'table-mic': { webex: 'native' },
  'ceiling-mic': { webex: 'native' },
  'quad-camera': { webex: 'native' },
  'room-vision-ptz': { webex: 'native' },
  'ptz-4k-camera': { webex: 'native' },

  // ── Personal USB cameras — client apps ──
  'desk-camera-1080': { webex: 'app', teams: 'app', zoom: 'app', google: 'app' },
  'desk-camera-4k': { webex: 'app', teams: 'app', zoom: 'app', google: 'app' },
}
