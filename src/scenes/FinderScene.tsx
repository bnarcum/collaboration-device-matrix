import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  Billboard,
  OrbitControls,
  PerspectiveCamera,
  Text,
  Html,
} from '@react-three/drei'
import type { Category, Device, RoomSize } from '../data/types'
import { DevicePedestal } from '../three/DevicePedestal'
import { DeviceFloatingLabel } from '../ui/DeviceFloatingLabel'
import { SceneEnv } from '../three/SceneEnv'
import { ShowroomFloor } from '../three/ShowroomFloor'
import { deviceImage } from '../data/deviceImages'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface Filter {
  roomSize?: RoomSize
  category?: Category
}

interface Props {
  devices: Device[]
  filter: Filter
  step: 0 | 1 | 2
  selected?: Device | null
  onSelect: (d: Device) => void
}

/**
 * Finder scene
 * ─────────────
 * Step 0/1: a calm, slow-rotating "preview ring" of representative category
 * devices is shown in the background while the question card is up. No
 * labels, no clutter.
 *
 * Step 2: the matching devices fly forward into a clean grid centered on the
 * lower stage, with labels alternating above/below to avoid collisions.
 * Non-matching devices recede out of frame.
 */
export function FinderScene({
  devices,
  filter,
  step,
  selected,
  onSelect,
}: Props) {
  // No matches until the user has at least picked a room size.
  const matching = useMemo(() => {
    if (step < 2) return [] as Device[]
    return devices.filter((d) => {
      if (filter.roomSize && !d.roomSizes.includes(filter.roomSize))
        return false
      if (filter.category && d.category !== filter.category) return false
      return true
    })
  }, [devices, filter, step])

  /**
   * Compute target positions for every device. We split into three buckets:
   *  - Step 2 matches  → tidy grid on the lower stage.
   *  - Step 0/1 preview → 6 representative devices on a slow ring far back.
   *  - Everything else  → tucked far behind the camera (effectively hidden).
   */
  const targets = useMemo(
    () => computeTargets(devices, matching, step),
    [devices, matching, step],
  )

  const cameraPos: [number, number, number] =
    step === 2 ? [0, 6, 9] : [0, 3.2, 8.5]
  const cameraTarget: [number, number, number] =
    step === 2 ? [0, 0.4, 0] : [0, 0.6, -4]

  return (
    <>
      <SceneEnv />
      <PerspectiveCamera makeDefault fov={42} position={cameraPos} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.12}
        target={cameraTarget}
        minDistance={4}
        maxDistance={18}
        maxPolarAngle={Math.PI * 0.42}
        enablePan={step === 2}
      />

      <ShowroomFloor />

      {/* Headline when results are shown — always faces the camera */}
      {step === 2 && (
        <Billboard position={[0, 2.6, -1]}>
          <Text
            fontSize={0.22}
            color="#049fd9"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.005}
            outlineColor="#05080f"
          >
            {matching.length === 0
              ? 'No devices match — try a different combination'
              : `${matching.length} match${matching.length === 1 ? '' : 'es'}`}
          </Text>
        </Billboard>
      )}

      {/* Preview ring rotator (only animates when step < 2) */}
      <PreviewRotator active={step < 2} />

      {devices.map((d) => {
        const t = targets.get(d.id)
        if (!t) return null
        const isMatch = matching.some((m) => m.id === d.id)
        return (
          <FlyTo key={d.id} target={t} hide={!t.visible}>
            <DevicePedestal
              device={d}
              selected={selected?.id === d.id}
              showLabel={false}
              scale={t.scale}
              onClick={onSelect}
            />
            {step === 2 && isMatch && (
              <Html
                position={[
                  0,
                  t.labelAbove ? labelTopFor(d) : -0.3,
                  0,
                ]}
                center
                distanceFactor={9}
                style={{ pointerEvents: 'none' }}
                zIndexRange={[1, 0]}
              >
                <DeviceFloatingLabel
                  name={d.name}
                  vendorId={d.vendorId}
                  selected={selected?.id === d.id}
                  style={{ pointerEvents: 'none' }}
                />
              </Html>
            )}
          </FlyTo>
        )
      })}
    </>
  )
}

/**
 * Vertical position for a device's label so it always sits clear of the
 * top of either the primitive model or the photo billboard.
 */
function labelTopFor(d: Device): number {
  const hasPhoto = !!deviceImage(d.id)
  if (hasPhoto) {
    const primitiveLong = Math.max(d.size[0], d.size[1])
    const photoSize = Math.min(1.8, Math.max(0.7, primitiveLong * 0.9))
    return photoSize + 0.25
  }
  return d.size[1] + 0.55
}

/* ───────────────────── layout ───────────────────── */

interface Target {
  position: [number, number, number]
  scale: number
  visible: boolean
  labelAbove: boolean
}

/**
 * A small set of representative devices used for the idle "preview ring"
 * while the user is still answering questions. We pick one per category.
 */
const PREVIEW_IDS = [
  'logitech-rally-bar',
  'poly-studio-x70',
  'neat-board-50',
  'logitech-tap-ip',
  'poly-studio-e70',
  'logitech-scribe',
  'poly-ccx-700',
  'poly-voyager-focus-2',
]

function computeTargets(
  devices: Device[],
  matching: Device[],
  step: 0 | 1 | 2,
): Map<string, Target> {
  const map = new Map<string, Target>()

  // Step 2: arrange matches in a tidy grid centered on the stage.
  if (step === 2 && matching.length > 0) {
    // Photo billboards are ~0.7m–1.8m on their longest axis. The grid
    // needs to allow for the full billboard width plus label gutter so
    // adjacent devices never collide.
    const cellSize = Math.max(
      2.4,
      Math.max(
        ...matching.map((d) => {
          const hasPhoto = !!deviceImage(d.id)
          const primitiveLong = Math.max(d.size[0], d.size[1])
          const photoSize = Math.min(1.8, Math.max(0.7, primitiveLong * 0.9))
          return (hasPhoto ? photoSize : d.size[0]) + 0.9
        }),
      ),
    )
    const cols = Math.min(
      4,
      Math.max(1, Math.ceil(Math.sqrt(matching.length))),
    )
    const rows = Math.ceil(matching.length / cols)
    const spacingX = cellSize
    const spacingZ = cellSize * 0.95

    matching.forEach((d, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = (col - (cols - 1) / 2) * spacingX
      const z = (row - (rows - 1) / 2) * spacingZ
      map.set(d.id, {
        position: [x, 0, z],
        scale: 1,
        visible: true,
        labelAbove: row % 2 === 0,
      })
    })
  }

  // Step 0/1 preview ring (very slow rotation handled by PreviewRotator).
  const previewSet = new Set(PREVIEW_IDS)

  devices.forEach((d, i) => {
    if (map.has(d.id)) return

    if (step < 2 && previewSet.has(d.id)) {
      const idx = PREVIEW_IDS.indexOf(d.id)
      const total = PREVIEW_IDS.length
      const angle = (idx / total) * Math.PI * 2
      const radius = 5.5
      map.set(d.id, {
        position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius - 3],
        scale: 0.85,
        visible: true,
        labelAbove: true,
      })
      return
    }

    // Everything else: pushed far behind the camera, scaled to nothing.
    map.set(d.id, {
      position: [0, -2, -40 - (i % 5)],
      scale: 0,
      visible: false,
      labelAbove: true,
    })
  })

  return map
}

/* ───────────────────── helpers ───────────────────── */

function FlyTo({
  target,
  hide,
  children,
}: {
  target: Target
  hide: boolean
  children: React.ReactNode
}) {
  const ref = useRef<THREE.Group>(null)
  const targetScale = hide ? 0 : target.scale

  useFrame((_, dt) => {
    if (!ref.current) return
    ref.current.position.x = THREE.MathUtils.damp(
      ref.current.position.x,
      target.position[0],
      4,
      dt,
    )
    ref.current.position.y = THREE.MathUtils.damp(
      ref.current.position.y,
      target.position[1],
      4,
      dt,
    )
    ref.current.position.z = THREE.MathUtils.damp(
      ref.current.position.z,
      target.position[2],
      4,
      dt,
    )
    const cur = ref.current.scale.x
    const ns = THREE.MathUtils.damp(cur, targetScale, 5, dt)
    ref.current.scale.set(ns, ns, ns)
    // Cull from raycasting + rendering when fully hidden
    ref.current.visible = ns > 0.02
  })

  // Start hidden so devices don't snap-in on first render.
  return (
    <group ref={ref} scale={0.001}>
      {children}
    </group>
  )
}

/**
 * Slowly rotates the entire group of preview devices around the world Y
 * axis using world-space transforms applied to each child by FlyTo. We do
 * this by rotating the camera target indirectly via a small wrapper group.
 *
 * To keep the implementation simple and avoid double-rotation while still
 * letting OrbitControls drive the camera, we rotate the floor grid lighting
 * vector instead — a subtle effect that hints at motion without spinning
 * devices the user is trying to read.
 */
function PreviewRotator({ active }: { active: boolean }) {
  const ref = useRef<THREE.PointLight>(null)
  const prefersReducedMotion = useReducedMotion()
  useFrame(({ clock }) => {
    if (!ref.current) return
    if (!active) return
    if (prefersReducedMotion) {
      // Park the light at a tasteful static angle when motion is disabled.
      ref.current.position.x = 6
      ref.current.position.z = -3
      return
    }
    const t = clock.getElapsedTime() * 0.25
    ref.current.position.x = Math.cos(t) * 6
    ref.current.position.z = Math.sin(t) * 6 - 3
  })
  return (
    <pointLight
      ref={ref}
      color="#049fd9"
      intensity={active ? 1.4 : 0}
      distance={14}
      position={[6, 2, -3]}
    />
  )
}

/* ───────────────────── question definitions ───────────────────── */

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
      { label: 'Camera', value: 'camera' as Category, hint: 'PTZ, companion, whiteboard' },
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
