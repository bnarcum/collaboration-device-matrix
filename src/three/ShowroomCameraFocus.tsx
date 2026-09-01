import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Category, Device } from '../data/types'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useNarrowViewport } from '../hooks/useNarrowViewport'
import { estimateBillboardPlane } from './billboardSizing'
import type { ShowroomAllMode, ShowroomPlacement } from './showroomLayout'

export type { ShowroomPlacement }

interface CameraFrame {
  position: THREE.Vector3
  target: THREE.Vector3
}

interface OrbitControlsLike {
  target: THREE.Vector3
  update: () => void
  addEventListener?: (type: string, listener: () => void) => void
  removeEventListener?: (type: string, listener: () => void) => void
}

const OVERVIEW: CameraFrame = {
  position: new THREE.Vector3(9, 6, 9),
  target: new THREE.Vector3(0, 0, 0),
}

const OVERVIEW_NARROW: CameraFrame = {
  position: new THREE.Vector3(13.2, 10.4, 13.2),
  target: new THREE.Vector3(0, 0.22, 0),
}

function frameForDevice(
  device: Device,
  position: [number, number, number],
  allMode: ShowroomAllMode = 'floor',
): CameraFrame {
  const [x, y, z] = position
  const plane = estimateBillboardPlane(device)
  const lookY = y + plane.planeH * 0.42 + 0.12
  const target = new THREE.Vector3(x, lookY, z)

  if (allMode === 'wall' || allMode === 'hub') {
    const standOff = 2.4 + plane.footprint * 0.35
    return {
      position: new THREE.Vector3(x, lookY + 1.15, z + standOff),
      target,
    }
  }

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

function frameForWall(placements: ShowroomPlacement[]): CameraFrame {
  if (placements.length === 0) return overviewFrame()

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity

  for (const p of placements) {
    const [x, y, z] = p.position
    const plane = estimateBillboardPlane(p.device)
    minX = Math.min(minX, x - plane.planeW * 0.5)
    maxX = Math.max(maxX, x + plane.planeW * 0.5)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y + plane.planeH)
    minZ = Math.min(minZ, z)
    maxZ = Math.max(maxZ, z)
  }

  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const cz = (minZ + maxZ) / 2
  const width = Math.max(1, maxX - minX)
  const height = Math.max(1, maxY - minY)
  const fov = (45 * Math.PI) / 180
  const fit = Math.max(width, height * 1.15) * 0.5 / Math.tan(fov * 0.5)
  const standOff = Math.max(10, fit * 1.05)

  return {
    position: new THREE.Vector3(cx, cy + height * 0.04, maxZ + standOff),
    target: new THREE.Vector3(cx, cy, cz),
  }
}

function overviewFrame(
  placements: ShowroomPlacement[] = [],
  narrow = false,
): CameraFrame {
  const fallback = narrow ? OVERVIEW_NARROW : OVERVIEW
  if (placements.length === 0) {
    return {
      position: fallback.position.clone(),
      target: fallback.target.clone(),
    }
  }

  let maxR = 0
  let maxY = 0
  for (const p of placements) {
    const [x, y, z] = p.position
    const plane = estimateBillboardPlane(p.device)
    maxR = Math.max(maxR, Math.hypot(x, z) + plane.footprint * 0.3)
    maxY = Math.max(maxY, y + plane.planeH)
  }

  if (maxY < 1.4) {
    return {
      position: fallback.position.clone(),
      target: fallback.target.clone(),
    }
  }

  const midY = maxY * 0.42
  const dist = Math.max(16, maxR * 1.5, maxY * 1.35)
  return {
    position: new THREE.Vector3(
      dist * 0.74,
      midY + Math.max(5.2, maxY * 0.32),
      dist * 0.74,
    ),
    target: new THREE.Vector3(0, midY, 0),
  }
}

/** Frame a filtered horseshoe so devices sit mid-view, not on the horizon. */
function horizontalFov(verticalFov: number, aspect: number): number {
  return 2 * Math.atan(Math.tan(verticalFov * 0.5) * Math.max(aspect, 0.35))
}

function frameForCategory(
  placements: ShowroomPlacement[],
  narrow = false,
  aspect = 16 / 9,
): CameraFrame {
  if (placements.length === 0) return overviewFrame([], narrow)

  let cx = 0
  let cz = 0
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  let lookYSum = 0

  for (const p of placements) {
    const [x, , z] = p.position
    const plane = estimateBillboardPlane(p.device)
    cx += x
    cz += z
    minX = Math.min(minX, x - plane.planeW * 0.45)
    maxX = Math.max(maxX, x + plane.planeW * 0.45)
    minZ = Math.min(minZ, z)
    maxZ = Math.max(maxZ, z)
    lookYSum += plane.planeH * 0.4 + 0.1
  }

  const n = placements.length
  cx /= n
  cz /= n
  const lookY = lookYSum / n
  const width = Math.max(1.1, maxX - minX)
  const depth = Math.max(0.8, maxZ - minZ)

  const vFov = ((narrow ? 52 : 45) * Math.PI) / 180
  const widthFov = narrow ? horizontalFov(vFov, aspect) : vFov
  const fitW = width * 0.5 / Math.tan(widthFov * 0.5)
  const fitH = lookY / Math.tan(vFov * 0.5)
  const standOff = narrow
    ? Math.max(3.4, fitW * 1.06, fitH * 0.55, depth * 0.55 + 2.2)
    : Math.max(2.15, fitW * 0.9, depth * 0.5 + 1.85)
  const lift = Math.min(
    narrow ? 2.8 : 2.15,
    Math.max(narrow ? 1.5 : 0.95, lookY * 0.55 + width * (narrow ? 0.16 : 0.1)),
  )

  return {
    position: new THREE.Vector3(cx + width * 0.03, lookY + lift, maxZ + standOff),
    target: new THREE.Vector3(cx, lookY, cz),
  }
}

export type ShowroomFocusMode = 'hero' | 'ring'

interface Props {
  selected: Device | null
  placements: ShowroomPlacement[]
  /** Category filter driving layout — explicit dep so camera refocuses on filter change. */
  filter?: Category | 'all'
  /** hero = tight product shot; ring = full showroom floor (overview). */
  focusMode?: ShowroomFocusMode
  allMode?: ShowroomAllMode
}

/** Stable key for layout changes (filter / device list / ring geometry). */
export function placementsLayoutKey(
  placements: ShowroomPlacement[],
  filter: Category | 'all' = 'all',
  allMode: ShowroomAllMode = 'floor',
): string {
  const parts = placements.map(
    (p) => `${p.device.id}@${p.position.map((n) => n.toFixed(2)).join(',')}`,
  )
  parts.sort()
  return `${filter}|${allMode}|${parts.join(';')}`
}

function placementsLayoutKeyNarrow(
  placements: ShowroomPlacement[],
  filter: Category | 'all',
  allMode: ShowroomAllMode,
  narrow: boolean,
  aspect = 1,
): string {
  return `${placementsLayoutKey(placements, filter, allMode)}|n${narrow ? 1 : 0}|a${aspect.toFixed(2)}`
}

/**
 * Frames OrbitControls on the selected device (hero) or showroom overview (ring).
 * Lerps only when focus inputs change — pauses while the user orbits.
 */
export function ShowroomCameraFocus({
  selected,
  placements,
  filter = 'all',
  focusMode = 'ring',
  allMode = 'floor',
}: Props) {
  const camera = useThree((s) => s.camera)
  const viewportAspect = useThree((s) => s.size.width / Math.max(s.size.height, 1))
  const controls = useThree((s) => s.controls) as OrbitControlsLike | null
  const reducedMotion = useReducedMotion()
  const narrow = useNarrowViewport()
  const goal = useRef<CameraFrame>(overviewFrame())
  const animating = useRef(false)
  const userInteracting = useRef(false)
  const layoutKey = useMemo(
    () =>
      placementsLayoutKeyNarrow(
        placements,
        filter,
        allMode,
        narrow,
        viewportAspect,
      ),
    [placements, filter, allMode, narrow, viewportAspect],
  )

  const applyGoalToCamera = useCallback(
    (frame: CameraFrame, animate: boolean) => {
      goal.current = frame
      if (!controls) return

      if (reducedMotion || !animate) {
        camera.position.copy(frame.position)
        controls.target.copy(frame.target)
        controls.update()
        animating.current = false
      } else {
        animating.current = true
      }
    },
    [controls, reducedMotion, camera],
  )

  const syncCameraGoal = useCallback(
    (force = false) => {
      if (userInteracting.current && !force) return

      let frame: CameraFrame
      if (selected && focusMode === 'hero') {
        const placement = placements.find((p) => p.device.id === selected.id)
        if (!placement) return
        frame = frameForDevice(placement.device, placement.position, allMode)
      } else if (filter !== 'all' && placements.length > 0) {
        frame = frameForCategory(placements, narrow, viewportAspect)
      } else if (allMode === 'wall' && placements.length > 0) {
        frame = frameForWall(placements)
      } else if (allMode === 'hub' && placements.length > 0) {
        frame = frameForCategory(placements, narrow, viewportAspect)
      } else {
        frame = overviewFrame(placements, narrow)
      }

      applyGoalToCamera(frame, true)
    },
    [
      selected,
      placements,
      focusMode,
      filter,
      allMode,
      narrow,
      viewportAspect,
      applyGoalToCamera,
    ],
  )

  useLayoutEffect(() => {
    // Programmatic hero ↔ ring transitions must win over in-progress orbit drags.
    syncCameraGoal(true)
  }, [syncCameraGoal, layoutKey, focusMode])

  // OrbitControls registers after first paint — re-apply when controls appear.
  useEffect(() => {
    syncCameraGoal()
  }, [syncCameraGoal, controls])

  useEffect(() => {
    if (!controls?.addEventListener) return

    const onStart = () => {
      userInteracting.current = true
      animating.current = false
    }
    const onEnd = () => {
      userInteracting.current = false
    }

    controls.addEventListener('start', onStart)
    controls.addEventListener('end', onEnd)
    return () => {
      controls.removeEventListener?.('start', onStart)
      controls.removeEventListener?.('end', onEnd)
    }
  }, [controls])

  useFrame((_, dt) => {
    if (!controls || reducedMotion || !animating.current || userInteracting.current) {
      return
    }

    const g = goal.current
    const t = 1 - Math.pow(0.0008, dt * 1000)
    const step = Math.min(1, t * 5.5)

    controls.target.lerp(g.target, step)
    camera.position.lerp(g.position, step)
    controls.update()

    const targetDone = controls.target.distanceTo(g.target) < 0.02
    const posDone = camera.position.distanceTo(g.position) < 0.02
    if (targetDone && posDone) {
      controls.target.copy(g.target)
      camera.position.copy(g.position)
      controls.update()
      animating.current = false
    }
  })

  return null
}
