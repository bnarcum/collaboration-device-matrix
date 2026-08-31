import { useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { Category, Device } from '../data/types'
import { CATEGORY_LABELS } from '../data/types'
import { DevicePedestal } from '../three/DevicePedestal'
import { SceneEnv } from '../three/SceneEnv'
import { ShowroomFloor } from '../three/ShowroomFloor'
import { TronPostFX } from '../three/TronPostFX'
import {
  ShowroomCameraFocus,
  type ShowroomFocusMode,
} from '../three/ShowroomCameraFocus'
import {
  layoutByCategory,
  placementBounds,
  type ShowroomRing,
} from '../three/showroomLayout'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { resolveTronShowroom, TRON } from '../theme/tronShowroom'

interface Props {
  devices: Device[]
  filter?: Category | 'all'
  selected?: Device | null
  onSelect: (d: Device) => void
  focusMode?: ShowroomFocusMode
}

/**
 * Walkable virtual showroom: All view uses concentric rings; a category
 * filter lays devices on a front-facing horseshoe. Drag to orbit; scroll
 * to dolly. Click a device to inspect.
 */
export function ShowroomScene({
  devices,
  filter = 'all',
  selected,
  onSelect,
  focusMode = 'ring',
}: Props) {
  const layout = useMemo(
    () => layoutByCategory(devices, filter),
    [devices, filter],
  )
  const bounds = useMemo(
    () => placementBounds(layout.placements),
    [layout.placements],
  )

  const tron = resolveTronShowroom()
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <>
      {tron && <color attach="background" args={[TRON.void]} />}
      <SceneEnv />
      <OrbitControls
        makeDefault
        enablePan
        enableRotate
        enableDamping
        dampingFactor={0.08}
        minDistance={filter === 'all' ? 2.5 : 1.8}
        maxDistance={
          filter === 'all' ? 20 : Math.max(16, bounds.span * 2.4)
        }
        maxPolarAngle={Math.PI * 0.48}
      />

      <ShowroomFloor />

      {layout.rings.map((ring, i) => (
        <CategoryRing
          key={`${ring.category}-${i}-${ring.radius.toFixed(2)}`}
          ring={ring}
          label={CATEGORY_LABELS[ring.category]}
        />
      ))}

      {layout.placements.map((p) => (
        <DevicePedestal
          key={p.device.id}
          device={p.device}
          position={p.position}
          rotationY={p.rotationY}
          selected={selected?.id === p.device.id}
          hovered={hoveredId === p.device.id}
          showLabel
          onClick={onSelect}
          onHover={(d) => setHoveredId(d?.id ?? null)}
        />
      ))}

      <ShowroomCameraFocus
        selected={selected ?? null}
        placements={layout.placements}
        filter={filter}
        focusMode={focusMode}
      />

      <TronPostFX />
    </>
  )
}

/**
 * A faint hairline ring on the showroom floor — just enough to group devices
 * by category visually, without competing with the selection spotlight. The
 * geometry is a thin band and the shader keeps both core + bloom alphas very
 * low so the line reads like chalk on a stage, not a neon track.
 */
function CategoryRing({
  ring,
  label,
}: {
  ring: ShowroomRing
  label: string
}) {
  const { radius, thetaStart, thetaLength, labelPosition, showLabel } = ring
  const tron = resolveTronShowroom()
  const reduced = useReducedMotion()
  const segments = Math.max(
    48,
    Math.round(192 * (thetaLength / (Math.PI * 2))),
  )
  const uniforms = useMemo(
    () => ({
      uRadius: { value: radius },
      uColor: { value: new THREE.Color(tron ? TRON.cyan : '#02C8FF') },
      uTime: { value: 0 },
      uTron: { value: tron ? 1 : 0 },
    }),
    [radius, tron],
  )

  useFrame(({ clock }) => {
    if (reduced) return
    uniforms.uTime.value = clock.getElapsedTime()
  })

  return (
    <group position={[0, 0.004, 0]}>
      {/* renderOrder=-1 forces the ring into the floor pass so devices and
          their billboards always paint on top of it, even where the photo
          alpha is too soft to write depth on its own. */}
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <mesh renderOrder={-1}>
          <ringGeometry
            args={[
              radius - 0.06,
              radius + 0.06,
              segments,
              1,
              thetaStart,
              thetaLength,
            ]}
          />
          <shaderMaterial
            transparent
            depthWrite={false}
            uniforms={uniforms}
            vertexShader={ringVert}
            fragmentShader={ringFrag}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh renderOrder={-2}>
          <ringGeometry
            args={[
              radius - 0.14,
              radius + 0.14,
              segments,
              1,
              thetaStart,
              thetaLength,
            ]}
          />
          <shaderMaterial
            transparent
            depthWrite={false}
            uniforms={uniforms}
            vertexShader={ringVert}
            fragmentShader={ringBloomFrag}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>
      {showLabel && <RingLabel label={label} position={labelPosition} />}
    </group>
  )
}

const ringVert = /* glsl */ `
  varying vec2 vLocal;
  void main() {
    vLocal = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const ringFrag = /* glsl */ `
  precision highp float;
  varying vec2 vLocal;
  uniform float uRadius;
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uTron;

  void main() {
    float r = length(vLocal);
    float d = abs(r - uRadius) / 0.06;
    float core  = 1.0 - smoothstep(0.0, 0.32, d);
    float bloom = 1.0 - smoothstep(0.0, 1.2,  d);
    float pulse = uTron > 0.5
      ? 0.82 + 0.18 * sin(uTime * 2.0 + uRadius * 0.35)
      : 1.0;
    float coreA = uTron > 0.5 ? 0.92 : 0.5;
    float bloomA = uTron > 0.5 ? 0.48 : 0.26;
    float alpha = clamp((core * coreA + bloom * bloomA) * pulse, 0.0, 1.0);
    gl_FragColor = vec4(uColor, alpha);
  }
`

const ringBloomFrag = /* glsl */ `
  precision highp float;
  varying vec2 vLocal;
  uniform float uRadius;
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uTron;

  void main() {
    float r = length(vLocal);
    float d = abs(r - uRadius) / 0.14;
    float halo = 1.0 - smoothstep(0.0, 1.0, d);
    float pulse = uTron > 0.5
      ? 0.85 + 0.15 * sin(uTime * 1.6 + uRadius * 0.28)
      : 1.0;
    float alpha = halo * (uTron > 0.5 ? 0.28 : 0.19) * pulse;
    gl_FragColor = vec4(uColor, alpha);
  }
`

/**
 * HTML pill label anchored at the outer edge of each ring. Reuses the Cisco
 * blue border so the label visually belongs to the ring it sits on.
 */
function RingLabel({
  label,
  position,
}: {
  label: string
  position: [number, number, number]
}) {
  return (
    <Html
      position={position}
      center
      distanceFactor={9}
      style={{ pointerEvents: 'none' }}
      zIndexRange={[1, 0]}
    >
      <div
        style={
          resolveTronShowroom()
            ? {
                padding: '4px 12px',
                borderRadius: 2,
                background: 'rgba(0, 0, 0, 0.72)',
                border: `1px solid ${TRON.cyan}`,
                color: TRON.cyan,
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                fontWeight: 700,
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                whiteSpace: 'nowrap',
                boxShadow: `0 0 14px rgba(0, 255, 240, 0.45), inset 0 0 8px rgba(0, 255, 240, 0.12)`,
                textShadow: '0 0 8px rgba(0, 255, 240, 0.85)',
              }
            : {
                padding: '5px 11px',
                borderRadius: 999,
                background: 'rgba(5, 8, 15, 0.78)',
                border: '1px solid rgba(2, 200, 255, 0.65)',
                color: '#e6f0fa',
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 600,
                backdropFilter: 'blur(8px)',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 14px rgba(0,0,0,0.45)',
              }
        }
      >
        {label}
      </div>
    </Html>
  )
}
