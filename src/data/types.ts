/** Shared catalog types for Cisco and partner collaboration devices. */

export type VendorId = 'cisco' | 'logitech' | 'poly' | 'neat'

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
  colors: DeviceColor[]
  surface: string
  shape: Shape
  size: [number, number, number]
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
