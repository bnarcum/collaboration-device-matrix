import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Category, Device } from '../data/types'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { estimateBillboardPlane } from './billboardSizing'

export interface ShowroomPlacement {
  device: Device
  position: [number, number, number]
  rotationY: number
}

interface CameraFrame {
  position: THREE.Vector3
  target: THREE.Vector3
}

interface OrbitControlsLike {
  target: THREE.Vector3
  update: () => void
}

const OVERVIEW: CameraFrame = {
  position: new THREE.Vector3(9, 6, 9),
  target: new THREE.Vector3(0, 0, 0),
}

function frameForDevice(
  device: Device,
  position: [number, number, number],
): CameraFrame {
  const [x, , z] = position
  const plane = estimateBillboardPlane(device)
  const lookY = plane.planeH * 0.42 + 0.12
  const target = new THREE.Vector3(x, lookY, z)

  const radial = new THREE.Vector3(x, 0, z)
  const distFromCenter = radial.length()

  if (distFromCenter < 0.15) {
    return {
      position: new THREE.Vector3(0.9, lookY + 2.4, 3.4),
      target: target.clone(),
    }
  }

  radial.normalize()
  const standOff = 2.35 + plane.footprint * 0.4
  const lift = 1.85 + plane.planeH * 0.12
  const side = new THREE.Vector3(-radial.z, 0, radial.x).multiplyScalar(0.75)

  const positionOut = target
    .clone()
    .add(radial.clone().multiplyScalar(standOff))
    .add(new THREE.Vector3(0, lift, 0))
    .add(side)

  return { position: positionOut, target }
}

/** Wide category ring — selected device stays spotlighted at the front of the arc. */
function frameRingShowroom(
  device: Device,
  position: [number, number, number],
  ringRadius: number,
): CameraFrame {
  const [x, , z] = position
  const plane = estimateBillboardPlane(device)
  const lookY = plane.planeH * 0.32 + 0.1
  const target = new THREE.Vector3(x * 0.18, lookY * 0.55, z * 0.18)

  const radial = new THREE.Vector3(x, 0, z)
  const distFromCenter = radial.length()
  if (distFromCenter > 0.08) radial.normalize()
  else radial.set(0, 0, 1)

  const dist = Math.max(ringRadius * 2.65, 7.8)
  const positionOut = target
    .clone()
    .add(radial.clone().multiplyScalar(-dist * 0.72))
    .add(new THREE.Vector3(0, dist * 0.58, 0))

  return { position: positionOut, target }
}

export type ShowroomFocusMode = 'hero' | 'ring'

interface Props {
  selected: Device | null
  placements: ShowroomPlacement[]
  /** Category filter driving layout — explicit dep so camera refocuses on filter change. */
  filter?: Category | 'all'
  /** hero = tight product shot; ring = full category showroom arc. */
  focusMode?: ShowroomFocusMode
  ringRadius?: number
}

/** Stable key for layout changes (filter / device list / ring geometry). */
export function placementsLayoutKey(
  placements: ShowroomPlacement[],
  filter: Category | 'all' = 'all',
): string {
  const parts = placements.map(
    (p) => `${p.device.id}@${p.position.map((n) => n.toFixed(2)).join(',')}`,
  )
  parts.sort()
  return `${filter}|${parts.join(';')}`
}

/**
 * Smoothly frames OrbitControls on the selected showroom device (or overview
 * when deselected). Works for embed deep-links with ?device=… as well as clicks.
 */
export function ShowroomCameraFocus({
  selected,
  placements,
  filter = 'all',
  focusMode = 'ring',
  ringRadius = 2.4,
}: Props) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as OrbitControlsLike | null
  const reducedMotion = useReducedMotion()
  const goal = useRef<CameraFrame>({
    position: OVERVIEW.position.clone(),
    target: OVERVIEW.target.clone(),
  })
  const snapNext = useRef(false)
  const layoutKey = useMemo(
    () => placementsLayoutKey(placements, filter),
    [placements, filter],
  )

  const syncCameraGoal = useCallback(() => {
    let frame: CameraFrame
    if (selected) {
      const placement = placements.find((p) => p.device.id === selected.id)
      if (!placement) return
      frame =
        focusMode === 'hero'
          ? frameForDevice(placement.device, placement.position)
          : frameRingShowroom(
              placement.device,
              placement.position,
              ringRadius,
            )
    } else {
      frame = {
        position: OVERVIEW.position.clone(),
        target: OVERVIEW.target.clone(),
      }
    }

    goal.current = frame
    if (!controls) return

    if (reducedMotion) {
      camera.position.copy(frame.position)
      controls.target.copy(frame.target)
      controls.update()
      snapNext.current = false
    } else {
      snapNext.current = true
    }
  }, [selected, placements, controls, reducedMotion, camera, focusMode, ringRadius])

  useLayoutEffect(() => {
    syncCameraGoal()
  }, [syncCameraGoal, layoutKey])

  // OrbitControls registers after first paint — re-apply when controls appear.
  useEffect(() => {
    syncCameraGoal()
  }, [syncCameraGoal, controls])

  useFrame((_, dt) => {
    if (!controls || reducedMotion) return

    const g = goal.current
    const t = 1 - Math.pow(0.0008, dt * 1000)
    const step = Math.min(1, t * 5.5)

    controls.target.lerp(g.target, step)
    camera.position.lerp(g.position, step)
    controls.update()

    if (snapNext.current) {
      const targetDone = controls.target.distanceTo(g.target) < 0.02
      const posDone = camera.position.distanceTo(g.position) < 0.02
      if (targetDone && posDone) {
        controls.target.copy(g.target)
        camera.position.copy(g.position)
        controls.update()
        snapNext.current = false
      }
    }
  })

  return null
}
