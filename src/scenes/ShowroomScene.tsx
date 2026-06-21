import { useMemo } from 'react'
import { Html, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { Category, Device } from '../data/types'
import { CATEGORY_ORDER, CATEGORY_LABELS } from '../data/types'
import { DevicePedestal } from '../three/DevicePedestal'
import { estimateBillboardPlane } from '../three/billboardSizing'
import { SceneEnv } from '../three/SceneEnv'
import { ShowroomFloor } from '../three/ShowroomFloor'

interface Props {
  devices: Device[]
  filter?: Category | 'all'
  selected?: Device | null
  onSelect: (d: Device) => void
}

/**
 * Walkable virtual showroom: devices are arranged in concentric "rings" by
 * category. Drag to orbit; scroll to dolly. Click a device to inspect.
 */
export function ShowroomScene({
  devices,
  filter = 'all',
  selected,
  onSelect,
}: Props) {
  const layout = useMemo(
    () => layoutByCategory(devices, filter),
    [devices, filter],
  )
  const maxRingRadius = useMemo(
    () => layout.rings.reduce((max, r) => Math.max(max, r.radius), 0),
    [layout.rings],
  )

  return (
    <>
      <SceneEnv />
      <OrbitControls
        makeDefault
        enablePan
        enableDamping
        dampingFactor={0.08}
        minDistance={filter === 'all' ? 2.5 : 1.6}
        maxDistance={filter === 'all' ? 20 : Math.max(7, maxRingRadius * 2.6)}
        maxPolarAngle={Math.PI * 0.42}
      />

      <ShowroomFloor />

      {layout.rings.map((ring) => (
        <CategoryRing
          key={ring.category}
          radius={ring.radius}
          label={CATEGORY_LABELS[ring.category]}
          labelAngle={ring.labelAngle}
        />
      ))}

      {layout.placements.map((p) => (
        <DevicePedestal
          key={p.device.id}
          device={p.device}
          position={p.position}
          rotationY={p.rotationY}
          selected={selected?.id === p.device.id}
          showLabel
          onClick={onSelect}
        />
      ))}
    </>
  )
}

interface Placement {
  device: Device
  position: [number, number, number]
  rotationY: number
}

/** Gap between billboard footprints along a filtered ring (meters). */
const COMPACT_GAP = 0.35

function fullRingAngles(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i / count) * Math.PI * 2)
}

/**
 * Filtered view: one ring, devices evenly spaced 360°, radius sized from the
 * largest billboard footprint so neighbors do not overlap.
 */
function compactLayout(devices: Device[]): { radius: number; angles: number[] } {
  const count = devices.length
  if (count === 0) return { radius: 0.9, angles: [] }
  if (count === 1) return { radius: 0.95, angles: [0] }

  const maxFootprint = Math.max(
    ...devices.map((d) => estimateBillboardPlane(d).footprint),
    0.55,
  )
  const spacing = maxFootprint + COMPACT_GAP
  const angleStep = (Math.PI * 2) / count
  const fromAngle = spacing / (2 * Math.sin(angleStep / 2))
  const fromCirc = (count * spacing) / (Math.PI * 2)
  const radius = Math.max(fromAngle, fromCirc, 0.95)

  return { radius, angles: fullRingAngles(count) }
}

function layoutByCategory(devices: Device[], filter: Category | 'all') {
  const useCompactArc = filter !== 'all'
  const rings: {
    category: Device['category']
    radius: number
    labelAngle: number
  }[] = []
  const placements: Placement[] = []
  let baseRadius = 2.4
  for (const cat of CATEGORY_ORDER) {
    const inCat = devices.filter((d) => d.category === cat)
    if (inCat.length === 0) continue

    const compact = useCompactArc ? compactLayout(inCat) : null
    const radius = compact ? compact.radius : baseRadius
    const labelAngle = 0
    const angles =
      compact?.angles ??
      fullRingAngles(inCat.length)

    rings.push({ category: cat, radius, labelAngle })
    inCat.forEach((d, i) => {
      const angle = angles[i] ?? 0
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      placements.push({
        device: d,
        position: [x, 0, z],
        rotationY: -angle + Math.PI / 2,
      })
    })
    if (!useCompactArc) baseRadius += 2.0
  }
  return { rings, placements }
}

/**
 * A faint hairline ring on the showroom floor — just enough to group devices
 * by category visually, without competing with the selection spotlight. The
 * geometry is a thin band and the shader keeps both core + bloom alphas very
 * low so the line reads like chalk on a stage, not a neon track.
 */
function CategoryRing({
  radius,
  label,
  labelAngle,
}: {
  radius: number
  label: string
  labelAngle: number
}) {
  const uniforms = useMemo(
    () => ({
      uRadius: { value: radius },
      uColor: { value: new THREE.Color('#02C8FF') },
    }),
    [radius],
  )

  return (
    <group position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* renderOrder=-1 forces the ring into the floor pass so devices and
          their billboards always paint on top of it, even where the photo
          alpha is too soft to write depth on its own. */}
      <mesh renderOrder={-1}>
        <ringGeometry args={[radius - 0.06, radius + 0.06, 192]} />
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
        <ringGeometry args={[radius - 0.14, radius + 0.14, 192]} />
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
      <RingLabel label={label} radius={radius} labelAngle={labelAngle} />
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

// Bright core line with a wider bloom halo — reads on stage / big screens.
const ringFrag = /* glsl */ `
  precision highp float;
  varying vec2 vLocal;
  uniform float uRadius;
  uniform vec3 uColor;

  void main() {
    float r = length(vLocal);
    float d = abs(r - uRadius) / 0.06;
    float core  = 1.0 - smoothstep(0.0, 0.32, d);
    float bloom = 1.0 - smoothstep(0.0, 1.2,  d);
    float alpha = clamp(core * 0.92 + bloom * 0.38, 0.0, 1.0);
    gl_FragColor = vec4(uColor, alpha);
  }
`

const ringBloomFrag = /* glsl */ `
  precision highp float;
  varying vec2 vLocal;
  uniform float uRadius;
  uniform vec3 uColor;

  void main() {
    float r = length(vLocal);
    float d = abs(r - uRadius) / 0.14;
    float halo = 1.0 - smoothstep(0.0, 1.0, d);
    float alpha = halo * 0.22;
    gl_FragColor = vec4(uColor, alpha);
  }
`

/**
 * HTML pill label anchored at the outer edge of each ring. Reuses the Cisco
 * blue border so the label visually belongs to the ring it sits on.
 */
function RingLabel({
  radius,
  label,
  labelAngle,
}: {
  radius: number
  label: string
  labelAngle: number
}) {
  const labelR = radius + 0.55
  return (
    <Html
      position={[
        Math.cos(labelAngle) * labelR,
        0.03,
        Math.sin(labelAngle) * labelR,
      ]}
      center
      distanceFactor={9}
      style={{ pointerEvents: 'none' }}
      zIndexRange={[1, 0]}
    >
      <div
        style={{
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
        }}
      >
        {label}
      </div>
    </Html>
  )
}
