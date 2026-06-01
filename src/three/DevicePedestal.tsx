import { useCallback, useMemo, useRef, useState } from 'react'
import { Html, SpotLight } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Device } from '../data/types'
import { deviceImage, devicePhotoAspect } from '../data/deviceImages'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { DeviceFloatingLabel } from '../ui/DeviceFloatingLabel'
import { DeviceModel } from './DeviceModel'
import {
  estimateBillboardPlane,
  type BillboardPlane,
} from './billboardSizing'
import { PhotoBillboard } from './PhotoBillboard'

interface Props {
  device: Device
  position?: [number, number, number]
  rotationY?: number
  /** Scale applied uniformly. */
  scale?: number
  selected?: boolean
  /** Show floating label & price chip. */
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
              aspectHint={devicePhotoAspect(device.id)}
              selected={selected}
              onPlaneSize={onPlaneSize}
            />
          </group>
          <mesh
            position={[0, 0.003, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[footprint * 0.3, 32]} />
            <meshBasicMaterial
              color="#000"
              transparent
              opacity={0.18}
              depthWrite={false}
            />
          </mesh>
        </>
      ) : (
        <group scale={scale} position={[0, device.size[1] / 2 + 0.02, 0]}>
          <DeviceModel device={device} highlighted={selected} />
        </group>
      )}
      {selected && <SelectionSpot footprint={footprint} />}
      {showLabel && (
        <Html
          position={[0, (imageUrl ? planeH : device.size[1]) + 0.35, 0]}
          center
          distanceFactor={6}
          zIndexRange={[1, 0]}
        >
          <DeviceFloatingLabel
            name={device.name}
            vendorId={device.vendorId}
            selected={selected}
          />
        </Html>
      )}
    </group>
  )
}

/**
 * Soft volumetric spotlight + radial pool of light on the floor. We use this
 * instead of a flat blue ring to indicate selection — the cone visually
 * "spotlights" the device the way a stage light would.
 *
 * The spot is parented to the device group, so it follows the device wherever
 * it flies to in the Finder grid.
 */
function SelectionSpot({ footprint }: { footprint: number }) {
  const target = useMemo(() => {
    const obj = new THREE.Object3D()
    obj.position.set(0, 0, 0)
    return obj
  }, [])

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color('#049fd9') },
      uTime: { value: 0 },
      uPulse: { value: 1 },
    }),
    [],
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
        color="#049fd9"
        intensity={9}
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
    float a = clamp(core * 0.55 + halo * 0.22, 0.0, 1.0) * pulse;
    gl_FragColor = vec4(uColor, a);
  }
`
