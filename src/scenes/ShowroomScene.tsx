import { useMemo } from 'react'
import { Html, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { Device } from '../data/types'
import { CATEGORY_ORDER, CATEGORY_LABELS } from '../data/types'
import { DevicePedestal } from '../three/DevicePedestal'
import { SceneEnv } from '../three/SceneEnv'
import { ShowroomFloor } from '../three/ShowroomFloor'

interface Props {
  devices: Device[]
  selected?: Device | null
  onSelect: (d: Device) => void
}

/**
 * Walkable virtual showroom: devices are arranged in concentric "rings" by
 * category. Drag to orbit; scroll to dolly. Click a device to inspect.
 */
export function ShowroomScene({ devices, selected, onSelect }: Props) {
  const layout = useMemo(() => layoutByCategory(devices), [devices])

  return (
    <>
      <SceneEnv />
      <OrbitControls
        makeDefault
        enablePan
        enableDamping
        dampingFactor={0.08}
        minDistance={2.5}
        maxDistance={20}
        maxPolarAngle={Math.PI * 0.42}
      />

      <ShowroomFloor />

      {layout.rings.map((ring) => (
        <CategoryRing
          key={ring.category}
          radius={ring.radius}
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

function layoutByCategory(devices: Device[]) {
  const rings: { category: Device['category']; radius: number }[] = []
  const placements: Placement[] = []
  let radius = 2.4
  for (const cat of CATEGORY_ORDER) {
    const inCat = devices.filter((d) => d.category === cat)
    if (inCat.length === 0) continue
    rings.push({ category: cat, radius })
    inCat.forEach((d, i) => {
      const angle = (i / inCat.length) * Math.PI * 2
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      placements.push({
        device: d,
        position: [x, 0, z],
        rotationY: -angle + Math.PI / 2,
      })
    })
    radius += 2.0
  }
  return { rings, placements }
}

/**
 * A faint hairline ring on the showroom floor — just enough to group devices
 * by category visually, without competing with the selection spotlight. The
 * geometry is a thin band and the shader keeps both core + bloom alphas very
 * low so the line reads like chalk on a stage, not a neon track.
 */
function CategoryRing({ radius, label }: { radius: number; label: string }) {
  const uniforms = useMemo(
    () => ({
      uRadius: { value: radius },
      uColor: { value: new THREE.Color('#049fd9') },
    }),
    [radius],
  )

  return (
    <group position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* renderOrder=-1 forces the ring into the floor pass so devices and
          their billboards always paint on top of it, even where the photo
          alpha is too soft to write depth on its own. */}
      <mesh renderOrder={-1}>
        <ringGeometry args={[radius - 0.04, radius + 0.04, 192]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          uniforms={uniforms}
          vertexShader={ringVert}
          fragmentShader={ringFrag}
          side={THREE.DoubleSide}
        />
      </mesh>
      <RingLabel label={label} radius={radius} />
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

// Soft hairline with a wider, even softer bloom so the rim of the band fades
// gracefully into the floor instead of cutting a hard edge.
const ringFrag = /* glsl */ `
  precision highp float;
  varying vec2 vLocal;
  uniform float uRadius;
  uniform vec3 uColor;

  void main() {
    float r = length(vLocal);
    float d = abs(r - uRadius) / 0.04;
    float core  = 1.0 - smoothstep(0.0, 0.35, d);
    float bloom = 1.0 - smoothstep(0.0, 1.4,  d);
    float alpha = clamp(core * 0.55 + bloom * 0.18, 0.0, 1.0);
    gl_FragColor = vec4(uColor, alpha);
  }
`

/**
 * HTML pill label anchored at the outer edge of each ring. Reuses the Cisco
 * blue border so the label visually belongs to the ring it sits on.
 */
function RingLabel({ radius, label }: { radius: number; label: string }) {
  return (
    <Html
      position={[radius + 0.55, 0.03, 0]}
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
          border: '1px solid rgba(4, 159, 217, 0.65)',
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
