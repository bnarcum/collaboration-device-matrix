import type { Category, Device, RoomSize } from './types'

export type FinderNeed = 'any' | 'video' | 'wireless' | 'kem'

export const FINDER_NEED_LABELS: Record<FinderNeed, string> = {
  any: 'No extra requirement',
  video: 'Needs video',
  wireless: 'Wireless / mobile',
  kem: 'Key expansion',
}

export const FINDER_NEED_ORDER: FinderNeed[] = [
  'any',
  'video',
  'wireless',
  'kem',
]

export const FINDER_QUESTIONS = [
  {
    title: 'What kind of space?',
    options: [
      { label: 'Personal desk', value: 'personal' as RoomSize, hint: '1 person' },
      { label: 'On the go', value: 'mobile' as RoomSize, hint: 'Frontline, field' },
      { label: 'Huddle', value: 'huddle' as RoomSize, hint: '2–6 people' },
      { label: 'Small room', value: 'small' as RoomSize, hint: '3–6 people' },
      { label: 'Medium room', value: 'medium' as RoomSize, hint: '6–12 people' },
      { label: 'Large room', value: 'large' as RoomSize, hint: '12+ people' },
      { label: 'Auditorium', value: 'auditorium' as RoomSize, hint: 'Cinematic' },
    ],
  },
  {
    title: 'What are you outfitting?',
    options: [
      { label: 'Anything', value: undefined, hint: 'Show me all matches' },
      { label: 'Room system', value: 'room' as Category, hint: 'Bars, boards, kits' },
      { label: 'Desk device', value: 'desk' as Category, hint: 'Desk, Desk Pro, Mini' },
      {
        label: 'Camera',
        value: 'camera' as Category,
        hint: 'PTZ, companion, whiteboard',
      },
      {
        label: 'Controller & audio',
        value: 'peripheral' as Category,
        hint: 'Tap, Pad, scheduling, audio',
      },
      { label: 'Phone', value: 'phone' as Category, hint: 'Desk & conference' },
      { label: 'Headset', value: 'headset' as Category, hint: 'USB, Bluetooth, DECT' },
    ],
  },
  {
    title: 'Any must-have?',
    options: [
      { label: 'Anything', value: 'any' as FinderNeed, hint: 'No extra filter' },
      { label: 'Video', value: 'video' as FinderNeed, hint: 'Camera or video phone' },
      {
        label: 'Wireless',
        value: 'wireless' as FinderNeed,
        hint: 'DECT, Wi-Fi, on the go',
      },
      {
        label: 'More line keys',
        value: 'kem' as FinderNeed,
        hint: 'Key expansion module',
      },
    ],
  },
] as const

export function deviceMatchesFinderNeed(
  device: Device,
  need?: FinderNeed,
): boolean {
  if (!need || need === 'any') return true
  if (need === 'video') {
    return (
      device.category === 'camera' ||
      Boolean(device.camera) ||
      /video/i.test(device.name) ||
      /video|camera|1080|4k/i.test(device.formFactor)
    )
  }
  if (need === 'wireless') {
    return (
      device.shape === 'wireless-phone' ||
      device.roomSizes.includes('mobile') ||
      /wireless|dect|wi-?fi/i.test(`${device.family} ${device.formFactor}`)
    )
  }
  return (
    device.shape === 'kem' ||
    /expansion|kem/i.test(`${device.name} ${device.formFactor}`)
  )
}

/** Narrow a device list using completed Finder answers. */
export function filterDevicesByFinder(
  devices: readonly Device[],
  roomSize: RoomSize,
  category?: Category,
  need?: FinderNeed,
): Device[] {
  return devices.filter((d) => {
    if (!d.roomSizes.includes(roomSize)) return false
    if (category && d.category !== category) return false
    if (!deviceMatchesFinderNeed(d, need)) return false
    return true
  })
}
