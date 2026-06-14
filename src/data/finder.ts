import type { Category, Device, RoomSize } from './types'

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
] as const

/** Narrow a device list using completed Finder answers (room size + optional category). */
export function filterDevicesByFinder(
  devices: readonly Device[],
  roomSize: RoomSize,
  category?: Category,
): Device[] {
  return devices.filter((d) => {
    if (!d.roomSizes.includes(roomSize)) return false
    if (category && d.category !== category) return false
    return true
  })
}
