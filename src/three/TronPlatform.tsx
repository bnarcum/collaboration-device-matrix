import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { resolveTronShowroom, TRON } from '../theme/tronShowroom'

interface Props {
  footprint: number
  selected?: boolean
}

/** Hex wireframe pad under each device — Tron grid disc. */
export function TronPlatform({ footprint, selected = false }: Props) {
  const reduced = useReducedMotion()
  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(TRON.cyan) },
      uAccent: { value: new THREE.Color(TRON.orange) },
      uTime: { value: 0 },
      uSelected: { value: selected ? 1 : 0 },
    }),
    [selected],
  )

  useFrame(({ clock }) => {
    if (reduced) return
    uniforms.uTime.value = clock.getElapsedTime()
  })

  if (!resolveTronShowroom()) return null

  const r = Math.max(0.55, footprint * 0.62)

  return (
    <group position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh renderOrder={2}>
        <ringGeometry args={[r * 0.72, r * 0.98, 6]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          uniforms={uniforms}
          vertexShader={padVert}
          fragmentShader={padFrag}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh renderOrder={1}>
        <ringGeometry args={[r * 0.98, r * 1.05, 6]} />
        <meshBasicMaterial
          color={TRON.cyanDim}
          transparent
          opacity={selected ? 0.55 : 0.28}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

const padVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const padFrag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform vec3 uAccent;
  uniform float uTime;
  uniform float uSelected;

  void main() {
    vec2 c = vUv - 0.5;
    float d = length(c) * 2.0;
    float edge = 1.0 - smoothstep(0.82, 1.0, d);
    float pulse = 0.88 + 0.12 * sin(uTime * 2.4 + d * 8.0);
    vec3 col = mix(uColor, uAccent, uSelected * 0.35);
    float a = edge * pulse * (0.35 + uSelected * 0.45);
    gl_FragColor = vec4(col, a);
  }
`
