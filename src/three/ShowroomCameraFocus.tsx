import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Device } from '../data/types'
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

interface Props {
  selected: Device | null
  placements: ShowroomPlacement[]
}

/**
 * Smoothly frames OrbitControls on the selected showroom device (or overview
 * when deselected). Works for embed deep-links with ?device=… as well as clicks.
 */
export function ShowroomCameraFocus({ selected, placements }: Props) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as OrbitControlsLike | null
  const reducedMotion = useReducedMotion()
  const goal = useRef<CameraFrame>({
    position: OVERVIEW.position.clone(),
    target: OVERVIEW.target.clone(),
  })
  const snapNext = useRef(false)

  useEffect(() => {
    if (!controls) return

    if (selected) {
      const placement = placements.find((p) => p.device.id === selected.id)
      if (!placement) return
      goal.current = frameForDevice(placement.device, placement.position)
    } else {
      goal.current = {
        position: OVERVIEW.position.clone(),
        target: OVERVIEW.target.clone(),
      }
    }

    if (reducedMotion) {
      camera.position.copy(goal.current.position)
      controls.target.copy(goal.current.target)
      controls.update()
      snapNext.current = false
    } else {
      snapNext.current = true
    }
  }, [selected?.id, placements, controls, reducedMotion, camera, selected])

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
