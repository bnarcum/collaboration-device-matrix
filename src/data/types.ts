/** Shared catalog types for Cisco and partner collaboration devices. */

export type VendorId = 'cisco' | 'logitech' | 'poly' | 'neat'

export type MeetingPlatformId = 'webex' | 'teams' | 'zoom' | 'google'

/** How a device supports a meeting platform (filter + compare source of truth). */
export type PlatformSupportLevel =
  | 'native'
  | 'mtr'
  | 'teams-panel'
  | 'teams-console'
  | 'vimt'
  | 'zoom-native'
  | 'zoom-sip'
  | 'guest'
  | 'app'

export type DevicePlatforms = Partial<
  Record<MeetingPlatformId, PlatformSupportLevel>
>

export type Category =
  | 'room'
  | 'desk'
  | 'peripheral'
  | 'camera'
  | 'phone'
  | 'headset'

export type RoomSize =
  | 'personal'
  | 'huddle'
  | 'small'
  | 'medium'
  | 'large'
  | 'auditorium'
  | 'mobile'

export type DeviceColor = 'carbon' | 'first-light' | 'silver' | 'white'

export type Shape =
  | 'board'
  | 'video-bar'
  | 'codec-kit'
  | 'desk-display'
  | 'desk-phone'
  | 'wireless-phone'
  | 'conference-phone'
  | 'kem'
  | 'headset-on-ear'
  | 'headset-over-ear'
  | 'headset-earbud'
  | 'navigator'
  | 'mic-table'
  | 'mic-ceiling'
  | 'camera-ptz'
  | 'camera-bar'
  | 'camera-puck'

export interface Device {
  id: string
  vendorId: VendorId
  name: string
  category: Category
  family: string
  formFactor: string
  tagline: string
  highlights: string[]
  useCases: string[]
  roomSizes: RoomSize[]
  recommendedPeople?: string
  display?: string
  camera?: string
  audio?: string
  connectivity?: string[]
  software?: string[]
  /** Structured meeting-platform support; Cisco entries use official allowlists. */
  platforms?: DevicePlatforms
  colors: DeviceColor[]
  surface: string
  shape: Shape
  size: [number, number, number]
  /**
   * Fine-tune product-photo billboard scale (1 = default). Use when vendor
   * hero art includes stands or padding that skews cross-vendor comparison.
   */
  photoScale?: number
}

export const CATEGORY_LABELS: Record<Category, string> = {
  room: 'Room devices',
  desk: 'Desk series',
  phone: 'Phones',
  headset: 'Headsets',
  peripheral: 'Peripherals',
  camera: 'Cameras',
}

export const CATEGORY_ORDER: Category[] = [
  'room',
  'desk',
  'phone',
  'headset',
  'peripheral',
  'camera',
]

export const ROOM_SIZE_LABELS: Record<RoomSize, string> = {
  personal: 'Personal / desk',
  huddle: 'Huddle',
  small: 'Small room',
  medium: 'Medium room',
  large: 'Large room',
  auditorium: 'Auditorium',
  mobile: 'Mobile / on-the-go',
}

export const ROOM_SIZE_ORDER: RoomSize[] = [
  'personal',
  'mobile',
  'huddle',
  'small',
  'medium',
  'large',
  'auditorium',
]

export const VENDOR_LABELS: Record<VendorId, string> = {
  cisco: 'Cisco',
  logitech: 'Logitech',
  poly: 'Poly',
  neat: 'Neat',
}

export const VENDOR_ORDER: VendorId[] = ['cisco', 'logitech', 'poly', 'neat']
