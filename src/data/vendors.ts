import type { VendorId } from './types'

export interface VendorResourceLink {
  label: string
  url: string
  meta?: string
  icon?: string
}

export interface VendorConfig {
  id: VendorId
  name: string
  website: string
  primary: string
  secondary: string
  disclaimer: string
  resourceLinks: VendorResourceLink[]
}

export const VENDORS: Record<VendorId, VendorConfig> = {
  cisco: {
    id: 'cisco',
    name: 'Cisco',
    website:
      'https://www.cisco.com/c/en/us/products/collaboration-endpoints/index.html',
    primary: '#049FD9',
    secondary: '#004BAF',
    disclaimer:
      'Specifications summarized from publicly available Cisco/Webex product documentation. This site is unaffiliated with Cisco.',
    resourceLinks: [
      {
        label: 'RoomOS ↗',
        url: 'https://roomos.cisco.com/doc/Welcome/Welcome',
        meta: 'Device documentation',
        icon: '⊞',
      },
      {
        label: 'Workspace Designer ↗',
        url: 'https://designer.webex.com/',
        meta: 'Plan a room',
        icon: '⌗',
      },
    ],
  },
  logitech: {
    id: 'logitech',
    name: 'Logitech',
    website: 'https://www.logitech.com/en-us/business/video-conferencing.html',
    primary: '#00b8fc',
    secondary: '#0078d4',
    disclaimer:
      'Specifications summarized from publicly available Logitech product documentation. This site is unaffiliated with Logitech.',
    resourceLinks: [
      {
        label: 'Logitech Sync ↗',
        url: 'https://www.logitech.com/en-us/software/sync.html',
        meta: 'Device management',
        icon: '⊞',
      },
      {
        label: 'Room configurator ↗',
        url: 'https://www.logitech.com/en-us/business/video-conferencing/room-configurator.html',
        meta: 'Plan a room',
        icon: '⌗',
      },
    ],
  },
  poly: {
    id: 'poly',
    name: 'Poly',
    website: 'https://www.poly.com/us/en/products/video-conferencing',
    primary: '#6161ff',
    secondary: '#0096d6',
    disclaimer:
      'Specifications summarized from publicly available Poly product documentation. This site is unaffiliated with Poly (HP).',
    resourceLinks: [
      {
        label: 'Poly Lens ↗',
        url: 'https://www.poly.com/us/en/products/services/poly-lens',
        meta: 'Cloud management',
        icon: '⊞',
      },
      {
        label: 'Studio portfolio ↗',
        url: 'https://www.poly.com/us/en/products/video-conferencing/studio-room-solutions',
        meta: 'Room systems',
        icon: '⎔',
      },
    ],
  },
  neat: {
    id: 'neat',
    name: 'Neat',
    website: 'https://www.neat.no',
    primary: '#ffffff',
    secondary: '#a3a3a3',
    disclaimer:
      'Specifications summarized from publicly available Neat product documentation. This site is unaffiliated with Neat.',
    resourceLinks: [
      {
        label: 'Neat support ↗',
        url: 'https://support.neat.no',
        meta: 'Documentation',
        icon: '⊞',
      },
      {
        label: 'Neat App ↗',
        url: 'https://www.neat.no/neat-app/',
        meta: 'Device management',
        icon: '⌗',
      },
    ],
  },
}

/** Text on filled vendor pills (topbar active buttons + device labels). */
export const VENDOR_LABEL_ON_PRIMARY = '#001724'

export const SELECTION_ACCENT = '#049FD9'

export interface VendorLabelTheme {
  background: string
  color: string
  border: string
}

/** Matches topbar `button[data-active='true']` fill per manufacturer. */
export function vendorLabelTheme(
  vendorId: VendorId,
  selected = false,
): VendorLabelTheme {
  const { primary, secondary } = vendorConfig(vendorId)
  if (selected) {
    return {
      background: SELECTION_ACCENT,
      color: VENDOR_LABEL_ON_PRIMARY,
      border: SELECTION_ACCENT,
    }
  }
  return {
    background: primary,
    color: VENDOR_LABEL_ON_PRIMARY,
    border: vendorId === 'neat' ? secondary : primary,
  }
}

export function vendorConfig(vendorId: VendorId): VendorConfig {
  return VENDORS[vendorId]
}
