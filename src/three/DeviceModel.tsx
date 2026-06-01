import { useMemo } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import type { Device, Shape } from '../data/types'

interface Props {
  device: Device
  /** When true, render in a brighter "selected" finish. */
  highlighted?: boolean
}

/**
 * Stylized representations of Cisco collaboration devices using primitive
 * geometry — no copyrighted product imagery is used. Each `shape` recipe
 * captures the silhouette of the device family (board, video bar, codec
 * kit, desk display, phone, headset, navigator, camera, microphone).
 */
export function DeviceModel({ device, highlighted = false }: Props) {
  const [w, h, d] = device.size
  return (
    <group>
      {renderShape(device.shape, w, h, d, device.surface, highlighted)}
    </group>
  )
}

function renderShape(
  shape: Shape,
  w: number,
  h: number,
  d: number,
  surface: string,
  highlighted: boolean,
) {
  switch (shape) {
    case 'board':
      return <BoardShape w={w} h={h} d={d} surface={surface} hi={highlighted} />
    case 'video-bar':
      return <VideoBarShape w={w} h={h} d={d} surface={surface} hi={highlighted} />
    case 'codec-kit':
      return <CodecShape w={w} h={h} d={d} surface={surface} hi={highlighted} />
    case 'desk-display':
      return <DeskShape w={w} h={h} d={d} surface={surface} hi={highlighted} />
    case 'desk-phone':
      return <DeskPhoneShape w={w} h={h} d={d} surface={surface} hi={highlighted} />
    case 'wireless-phone':
      return <WirelessPhoneShape w={w} h={h} d={d} surface={surface} hi={highlighted} />
    case 'conference-phone':
      return <ConferencePhoneShape w={w} h={h} d={d} surface={surface} hi={highlighted} />
    case 'kem':
      return <KemShape w={w} h={h} d={d} surface={surface} hi={highlighted} />
    case 'headset-on-ear':
    case 'headset-over-ear':
      return <HeadsetShape w={w} h={h} d={d} surface={surface} hi={highlighted} />
    case 'headset-earbud':
      return <EarbudShape w={w} h={h} d={d} surface={surface} hi={highlighted} />
    case 'navigator':
      return <NavigatorShape w={w} h={h} d={d} surface={surface} hi={highlighted} />
    case 'mic-table':
      return <TableMicShape w={w} h={h} d={d} surface={surface} hi={highlighted} />
    case 'mic-ceiling':
      return <CeilingMicShape w={w} h={h} d={d} surface={surface} hi={highlighted} />
    case 'camera-ptz':
      return <PtzCameraShape w={w} h={h} d={d} surface={surface} hi={highlighted} />
    case 'camera-bar':
      return <VideoBarShape w={w} h={h} d={d} surface={surface} hi={highlighted} cameraBar />
    case 'camera-puck':
      return <PuckCameraShape w={w} h={h} d={d} surface={surface} hi={highlighted} />
  }
}

interface ShapeProps {
  w: number
  h: number
  d: number
  surface: string
  hi: boolean
}

function useMaterials(surface: string, hi: boolean) {
  return useMemo(() => {
    const body = new THREE.MeshStandardMaterial({
      color: new THREE.Color(surface),
      roughness: 0.55,
      metalness: 0.25,
    })
    const screen = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0a1320'),
      emissive: new THREE.Color(hi ? '#049FD9' : '#0a3a55'),
      emissiveIntensity: hi ? 0.85 : 0.35,
      roughness: 0.18,
      metalness: 0.05,
    })
    const accent = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#049FD9'),
      emissive: new THREE.Color('#049FD9'),
      emissiveIntensity: hi ? 0.7 : 0.25,
      roughness: 0.4,
      metalness: 0.3,
    })
    const dark = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#0c0d10'),
      roughness: 0.7,
      metalness: 0.2,
    })
    const glass = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#06121d'),
      roughness: 0.1,
      metalness: 0.7,
    })
    return { body, screen, accent, dark, glass }
  }, [surface, hi])
}

function BoardShape({ w, h, d, surface, hi }: ShapeProps) {
  const m = useMaterials(surface, hi)
  const bezel = Math.min(w, h) * 0.045
  return (
    <group>
      <RoundedBox args={[w, h, d]} radius={Math.min(d, 0.025)} smoothness={4}>
        <primitive object={m.body} attach="material" />
      </RoundedBox>
      <mesh position={[0, 0, d / 2 + 0.001]}>
        <planeGeometry args={[w - bezel * 2, h - bezel * 2]} />
        <primitive object={m.screen} attach="material" />
      </mesh>
      {/* Camera bar at top */}
      <mesh position={[0, h / 2 - bezel * 0.6, d / 2 + 0.002]}>
        <boxGeometry args={[w * 0.18, bezel * 0.6, 0.005]} />
        <primitive object={m.dark} attach="material" />
      </mesh>
      <mesh position={[0, h / 2 - bezel * 0.6, d / 2 + 0.004]}>
        <sphereGeometry args={[bezel * 0.18, 16, 16]} />
        <primitive object={m.glass} attach="material" />
      </mesh>
    </group>
  )
}

function VideoBarShape({
  w,
  h,
  d,
  surface,
  hi,
  cameraBar = false,
}: ShapeProps & { cameraBar?: boolean }) {
  const m = useMaterials(surface, hi)
  return (
    <group>
      <RoundedBox args={[w, h, d]} radius={Math.min(h, d) * 0.45} smoothness={4}>
        <primitive object={m.body} attach="material" />
      </RoundedBox>
      {/* Lens cluster */}
      <mesh position={[w * 0.0, 0, d / 2 + 0.001]}>
        <ringGeometry args={[h * 0.18, h * 0.32, 32]} />
        <primitive object={m.accent} attach="material" />
      </mesh>
      <mesh position={[w * 0.0, 0, d / 2 + 0.002]}>
        <circleGeometry args={[h * 0.18, 32]} />
        <primitive object={m.glass} attach="material" />
      </mesh>
      {!cameraBar && (
        <mesh position={[w * 0.32, 0, d / 2 + 0.001]}>
          <circleGeometry args={[h * 0.15, 32]} />
          <primitive object={m.glass} attach="material" />
        </mesh>
      )}
      {/* Speaker grille hints */}
      <mesh position={[-w * 0.35, 0, d / 2 + 0.0005]}>
        <planeGeometry args={[w * 0.18, h * 0.55]} />
        <primitive object={m.dark} attach="material" />
      </mesh>
      <mesh position={[w * 0.43, 0, d / 2 + 0.0005]}>
        <planeGeometry args={[w * 0.1, h * 0.55]} />
        <primitive object={m.dark} attach="material" />
      </mesh>
    </group>
  )
}

function CodecShape({ w, h, d, surface, hi }: ShapeProps) {
  const m = useMaterials(surface, hi)
  return (
    <group>
      <RoundedBox args={[w, h, d]} radius={0.02} smoothness={3}>
        <primitive object={m.body} attach="material" />
      </RoundedBox>
      {/* Front panel detail */}
      <mesh position={[0, 0, d / 2 + 0.001]}>
        <planeGeometry args={[w * 0.92, h * 0.55]} />
        <primitive object={m.dark} attach="material" />
      </mesh>
      <mesh position={[w * 0.35, h * 0.12, d / 2 + 0.002]}>
        <sphereGeometry args={[h * 0.05, 24, 24]} />
        <primitive object={m.accent} attach="material" />
      </mesh>
      {/* Rack vents */}
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} position={[-w * 0.3 + i * 0.06, -h * 0.22, d / 2 + 0.002]}>
          <boxGeometry args={[0.04, 0.015, 0.002]} />
          <primitive object={m.dark} attach="material" />
        </mesh>
      ))}
    </group>
  )
}

function DeskShape({ w, h, d, surface, hi }: ShapeProps) {
  const m = useMaterials(surface, hi)
  const bezel = 0.02
  return (
    <group>
      {/* Stand */}
      <mesh position={[0, -h / 2 - 0.06, 0]}>
        <cylinderGeometry args={[w * 0.18, w * 0.22, 0.04, 24]} />
        <primitive object={m.body} attach="material" />
      </mesh>
      <mesh position={[0, -h / 2 + 0.02, 0]} rotation={[0.08, 0, 0]}>
        <boxGeometry args={[w * 0.18, 0.18, 0.02]} />
        <primitive object={m.body} attach="material" />
      </mesh>
      {/* Screen body */}
      <group rotation={[-0.08, 0, 0]}>
        <RoundedBox args={[w, h, d]} radius={0.015} smoothness={4}>
          <primitive object={m.body} attach="material" />
        </RoundedBox>
        <mesh position={[0, 0, d / 2 + 0.001]}>
          <planeGeometry args={[w - bezel * 2, h - bezel * 2]} />
          <primitive object={m.screen} attach="material" />
        </mesh>
        {/* Camera notch */}
        <mesh position={[0, h / 2 - bezel * 0.5, d / 2 + 0.002]}>
          <sphereGeometry args={[bezel * 0.5, 16, 16]} />
          <primitive object={m.glass} attach="material" />
        </mesh>
      </group>
    </group>
  )
}

function DeskPhoneShape({ w, h, d, surface, hi }: ShapeProps) {
  const m = useMaterials(surface, hi)
  return (
    <group rotation={[-0.45, 0, 0]} position={[0, 0, 0]}>
      <RoundedBox args={[w, h, d]} radius={0.012} smoothness={3}>
        <primitive object={m.body} attach="material" />
      </RoundedBox>
      {/* Screen */}
      <mesh position={[0, h * 0.18, d / 2 + 0.001]}>
        <planeGeometry args={[w * 0.78, h * 0.45]} />
        <primitive object={m.screen} attach="material" />
      </mesh>
      {/* Keypad */}
      {Array.from({ length: 12 }).map((_, i) => {
        const col = i % 3
        const row = Math.floor(i / 3)
        return (
          <mesh
            key={i}
            position={[
              -w * 0.22 + col * w * 0.22,
              -h * 0.18 - row * h * 0.08,
              d / 2 + 0.001,
            ]}
          >
            <boxGeometry args={[w * 0.16, h * 0.05, 0.003]} />
            <primitive object={m.dark} attach="material" />
          </mesh>
        )
      })}
      {/* Handset */}
      <group position={[w * 0.7, h * 0.05, d * 0.7]} rotation={[0, -0.15, 0]}>
        <mesh>
          <capsuleGeometry args={[d * 0.45, h * 0.9, 6, 12]} />
          <primitive object={m.body} attach="material" />
        </mesh>
      </group>
    </group>
  )
}

function WirelessPhoneShape({ w, h, d, surface, hi }: ShapeProps) {
  const m = useMaterials(surface, hi)
  return (
    <group>
      <RoundedBox args={[w, h, d]} radius={d * 0.4} smoothness={4}>
        <primitive object={m.body} attach="material" />
      </RoundedBox>
      <mesh position={[0, h * 0.1, d / 2 + 0.001]}>
        <planeGeometry args={[w * 0.78, h * 0.55]} />
        <primitive object={m.screen} attach="material" />
      </mesh>
      {/* Speaker */}
      <mesh position={[0, h * 0.42, d / 2 + 0.002]}>
        <boxGeometry args={[w * 0.35, h * 0.02, 0.003]} />
        <primitive object={m.dark} attach="material" />
      </mesh>
    </group>
  )
}

function ConferencePhoneShape({ w, h, d: _d, surface, hi }: ShapeProps) {
  const m = useMaterials(surface, hi)
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[w / 2, w / 2 * 1.05, h, 36]} />
        <primitive object={m.body} attach="material" />
      </mesh>
      {/* Center ring (LED indicator) */}
      <mesh position={[0, h / 2 + 0.0005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[w * 0.32, w * 0.4, 64]} />
        <primitive object={m.accent} attach="material" />
      </mesh>
      {/* Mics radiating */}
      {Array.from({ length: 3 }).map((_, i) => {
        const a = (i / 3) * Math.PI * 2
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * w * 0.36, h / 2 + 0.002, Math.sin(a) * w * 0.36]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[w * 0.05, w * 0.05, 0.005, 16]} />
            <primitive object={m.dark} attach="material" />
          </mesh>
        )
      })}
    </group>
  )
}

function KemShape({ w, h, d, surface, hi }: ShapeProps) {
  const m = useMaterials(surface, hi)
  return (
    <group>
      <RoundedBox args={[w, h, d]} radius={0.01} smoothness={3}>
        <primitive object={m.body} attach="material" />
      </RoundedBox>
      <mesh position={[0, 0, d / 2 + 0.001]}>
        <planeGeometry args={[w * 0.85, h * 0.85]} />
        <primitive object={m.screen} attach="material" />
      </mesh>
    </group>
  )
}

function HeadsetShape({ w, h, surface, hi }: ShapeProps) {
  const m = useMaterials(surface, hi)
  const cupR = Math.min(w, h) * 0.42
  return (
    <group>
      {/* Headband */}
      <mesh rotation={[0, 0, 0]}>
        <torusGeometry args={[w * 0.5, 0.012, 8, 32, Math.PI]} />
        <primitive object={m.body} attach="material" />
      </mesh>
      {/* Cups */}
      <mesh position={[-w * 0.5, -cupR * 0.4, 0]}>
        <sphereGeometry args={[cupR, 24, 24]} />
        <primitive object={m.body} attach="material" />
      </mesh>
      <mesh position={[w * 0.5, -cupR * 0.4, 0]}>
        <sphereGeometry args={[cupR, 24, 24]} />
        <primitive object={m.body} attach="material" />
      </mesh>
      {/* Cisco dot accent */}
      <mesh position={[-w * 0.5, -cupR * 0.4, cupR + 0.002]}>
        <circleGeometry args={[cupR * 0.18, 24]} />
        <primitive object={m.accent} attach="material" />
      </mesh>
      <mesh position={[w * 0.5, -cupR * 0.4, cupR + 0.002]}>
        <circleGeometry args={[cupR * 0.18, 24]} />
        <primitive object={m.accent} attach="material" />
      </mesh>
    </group>
  )
}

function EarbudShape({ w, h, d, surface, hi }: ShapeProps) {
  const m = useMaterials(surface, hi)
  return (
    <group>
      <mesh>
        <torusGeometry args={[w, h * 0.45, 16, 32]} />
        <primitive object={m.body} attach="material" />
      </mesh>
      <mesh position={[-w * 0.7, 0, d]}>
        <sphereGeometry args={[h * 0.55, 16, 16]} />
        <primitive object={m.body} attach="material" />
      </mesh>
      <mesh position={[w * 0.7, 0, d]}>
        <sphereGeometry args={[h * 0.55, 16, 16]} />
        <primitive object={m.body} attach="material" />
      </mesh>
    </group>
  )
}

function NavigatorShape({ w, h, d, surface, hi }: ShapeProps) {
  const m = useMaterials(surface, hi)
  const bezel = Math.min(w, h) * 0.04
  return (
    <group rotation={[d > 0.05 ? 0 : 0, 0, 0]}>
      <RoundedBox args={[w, h, d]} radius={0.012} smoothness={4}>
        <primitive object={m.body} attach="material" />
      </RoundedBox>
      <mesh position={[0, 0, d / 2 + 0.001]}>
        <planeGeometry args={[w - bezel * 2, h - bezel * 2]} />
        <primitive object={m.screen} attach="material" />
      </mesh>
      {/* sensor strip */}
      <mesh position={[0, -h / 2 + bezel * 0.4, d / 2 + 0.002]}>
        <boxGeometry args={[w * 0.4, bezel * 0.3, 0.003]} />
        <primitive object={m.accent} attach="material" />
      </mesh>
    </group>
  )
}

function TableMicShape({ w, h, surface, hi }: ShapeProps) {
  const m = useMaterials(surface, hi)
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[w / 2, w / 2 * 1.1, h, 32]} />
        <primitive object={m.body} attach="material" />
      </mesh>
      {/* button */}
      <mesh position={[0, h / 2 + 0.0005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[w * 0.18, 24]} />
        <primitive object={m.accent} attach="material" />
      </mesh>
      {/* mesh top */}
      <mesh position={[0, h / 2 + 0.0001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[w * 0.2, w * 0.46, 48]} />
        <primitive object={m.dark} attach="material" />
      </mesh>
    </group>
  )
}

function CeilingMicShape({ w, h, surface, hi }: ShapeProps) {
  const m = useMaterials(surface, hi)
  return (
    <group rotation={[Math.PI, 0, 0]}>
      <mesh>
        <cylinderGeometry args={[w / 2, w / 2 * 0.85, h, 36]} />
        <primitive object={m.body} attach="material" />
      </mesh>
      <mesh position={[0, -h / 2 - 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[w * 0.18, w * 0.45, 64]} />
        <primitive object={m.accent} attach="material" />
      </mesh>
    </group>
  )
}

function PtzCameraShape({ w, h, d: _d, surface, hi }: ShapeProps) {
  const m = useMaterials(surface, hi)
  return (
    <group>
      {/* Base */}
      <mesh position={[0, -h * 0.42, 0]}>
        <cylinderGeometry args={[w * 0.5, w * 0.5, h * 0.18, 24]} />
        <primitive object={m.body} attach="material" />
      </mesh>
      {/* Head */}
      <mesh position={[0, h * 0.05, 0]}>
        <sphereGeometry args={[Math.min(w, h) * 0.42, 24, 24]} />
        <primitive object={m.body} attach="material" />
      </mesh>
      {/* Lens */}
      <mesh
        position={[0, h * 0.05, Math.min(w, h) * 0.42]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[w * 0.18, w * 0.22, 0.04, 24]} />
        <primitive object={m.glass} attach="material" />
      </mesh>
      <mesh position={[0, h * 0.05, Math.min(w, h) * 0.42 + 0.005]}>
        <circleGeometry args={[w * 0.16, 24]} />
        <primitive object={m.accent} attach="material" />
      </mesh>
    </group>
  )
}

function PuckCameraShape({ w, h, d, surface, hi }: ShapeProps) {
  const m = useMaterials(surface, hi)
  return (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[h * 0.6, h * 0.6, w, 24]} />
        <primitive object={m.body} attach="material" />
      </mesh>
      <mesh position={[0, 0, d * 0.9]}>
        <circleGeometry args={[h * 0.4, 24]} />
        <primitive object={m.glass} attach="material" />
      </mesh>
      <mesh position={[0, 0, d * 0.92]}>
        <ringGeometry args={[h * 0.3, h * 0.42, 24]} />
        <primitive object={m.accent} attach="material" />
      </mesh>
    </group>
  )
}
