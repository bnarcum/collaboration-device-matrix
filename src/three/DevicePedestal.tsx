import { useCallback, useMemo, useRef, useState } from 'react'
import { Html, SpotLight } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Device } from '../data/types'
import { deviceImage, devicePhotoAspect } from '../data/deviceImages'
import { useReducedMotion } from '../hooks/useReducedMotion'
import {
  DeviceFloatingLabel,
  shortShowroomName,
} from '../ui/DeviceFloatingLabel'
import { DeviceModel } from './DeviceModel'
import {
  categoryMinFootprint,
  estimateBillboardPlane,
  type BillboardPlane,
} from './billboardSizing'
import { TronPlatform } from './TronPlatform'
import { PhotoBillboard } from './PhotoBillboard'
import { resolveTronShowroom, TRON } from '../theme/tronShowroom'

/** Spread neighboring pills onto 3 height lanes so they collide less on an arc. */
function labelLane(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return hash % 3
}

interface Props {
  device: Device
  position?: [number, number, number]
  rotationY?: number
  /** Scale applied uniformly. */
  scale?: number
  selected?: boolean
  hovered?: boolean
  /** Show the name pill above the device. */
  showLabel?: boolean
  onClick?: (device: Device) => void
  /** Hover handler for the carousel mode. */
  onHover?: (device: Device | null) => void
  /** Idle gentle rotation. */
  spin?: boolean
}

export function DevicePedestal({
  device,
  position = [0, 0, 0],
  rotationY = 0,
  scale = 1,
  selected = false,
  hovered = false,
  showLabel = false,
  onClick,
  onHover,
  spin = false,
}: Props) {
  const group = useRef<THREE.Group>(null)
  const baseY = position[1]
  const imageUrl = deviceImage(device.id)
  const prefersReducedMotion = useReducedMotion()
  const displaySize = useMemo(
    () => [device.size[0], device.size[1]] as [number, number],
    [device.size],
  )

  const initialPlane = useMemo(
    () => estimateBillboardPlane(device, scale),
    [device, scale],
  )
  const [billboard, setBillboard] = useState<BillboardPlane>(initialPlane)

  const onPlaneSize = useCallback((plane: BillboardPlane) => {
    setBillboard(plane)
  }, [])

  useFrame((_, dt) => {
    if (!group.current) return
    if (spin && !imageUrl && !prefersReducedMotion)
      group.current.rotation.y += dt * 0.25
    if (selected && !prefersReducedMotion) {
      group.current.position.y =
        baseY + Math.sin(performance.now() * 0.002) * 0.025
    } else {
      group.current.position.y = baseY
    }
  })

  const { planeH, footprint } = billboard

  return (
    <group
      ref={group}
      position={position}
      rotation={[0, rotationY, 0]}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(device)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
        onHover?.(device)
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        document.body.style.cursor = ''
        onHover?.(null)
      }}
    >
      {imageUrl ? (
        <>
          <TronPlatform footprint={footprint} selected={selected} />
          <mesh position={[0, planeH / 2, 0]} visible={false}>
            <boxGeometry args={[footprint, planeH, 0.3]} />
            <meshBasicMaterial />
          </mesh>
          <group position={[0, planeH / 2, 0]}>
            <PhotoBillboard
              url={imageUrl}
              displaySize={displaySize}
              photoScale={device.photoScale}
              pedestalScale={scale}
              minFootprint={categoryMinFootprint(device) * scale}
              aspectHint={devicePhotoAspect(device.id)}
              selected={selected}
              onPlaneSize={onPlaneSize}
            />
          </group>
        </>
      ) : (
        <>
          <TronPlatform
            footprint={Math.max(device.size[0], device.size[2]) * scale * 0.5}
            selected={selected}
          />
          <group scale={scale} position={[0, device.size[1] / 2 + 0.02, 0]}>
          <DeviceModel device={device} highlighted={selected} />
        </group>
        </>
      )}
      {selected && <SelectionSpot footprint={footprint} />}
      {showLabel && (
        <Html
          position={[
            0,
            (imageUrl ? planeH : device.size[1]) +
              (selected || hovered ? 0.28 : 0.12 + labelLane(device.id) * 0.16),
            0,
          ]}
          center
          zIndexRange={selected || hovered ? [12, 8] : [1, 0]}
          pointerEvents="none"
        >
          <DeviceFloatingLabel
            name={
              selected || hovered
                ? device.name
                : shortShowroomName(device.name)
            }
            vendorId={device.vendorId}
            selected={selected || hovered}
          />
        </Html>
      )}
    </group>
  )
}

/**
 * Soft volumetric spotlight on the floor for the selected device.
 * instead of a flat blue ring to indicate selection — the cone visually
 * "spotlights" the device the way a stage light would.
 *
 * The spot is parented to the device group, so it follows the device wherever
 * it flies to in the Finder grid.
 */
function SelectionSpot({ footprint }: { footprint: number }) {
  const tron = resolveTronShowroom()
  const target = useMemo(() => {
    const obj = new THREE.Object3D()
    obj.position.set(0, 0, 0)
    return obj
  }, [])

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(tron ? TRON.orange : '#02C8FF') },
      uTime: { value: 0 },
      uPulse: { value: 1 },
    }),
    [tron],
  )

  const prefersReducedMotion = useReducedMotion()

  useFrame(({ clock }) => {
    if (prefersReducedMotion) {
      uniforms.uTime.value = 0
      uniforms.uPulse.value = 0
    } else {
      uniforms.uTime.value = clock.getElapsedTime()
      uniforms.uPulse.value = 1
    }
  })

  const poolRadius = Math.max(0.75, footprint * 0.55)

  return (
    <group>
      <primitive object={target} />

      <SpotLight
        position={[0, 3.4, 0]}
        target={target}
        color={tron ? TRON.orange : '#02C8FF'}
        intensity={tron ? 12 : 9}
        distance={5.2}
        angle={0.42}
        penumbra={0.85}
        attenuation={3.2}
        anglePower={5.5}
        radiusTop={0.02}
        radiusBottom={0.9}
      />

      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
        <circleGeometry args={[poolRadius, 96]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          uniforms={uniforms}
          vertexShader={poolVert}
          fragmentShader={poolFrag}
        />
      </mesh>
    </group>
  )
}

const poolVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const poolFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uPulse;

  void main() {
    vec2 c = vUv - 0.5;
    float d = length(c) * 2.0;
    float core = 1.0 - smoothstep(0.0, 0.45, d);
    float halo = 1.0 - smoothstep(0.0, 1.0, d);
    float pulse = mix(1.0, 0.92 + 0.08 * sin(uTime * 1.8), uPulse);
    float a = clamp(core * 0.68 + halo * 0.32, 0.0, 1.0) * pulse;
    gl_FragColor = vec4(uColor, a);
  }
`
