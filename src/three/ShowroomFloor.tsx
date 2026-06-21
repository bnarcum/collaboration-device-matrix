import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { resolveTronShowroom, TRON } from '../theme/tronShowroom'

interface FloorProps {
  /**
   * When true, overlays a procedural anti-aliased grid (the original
   * showroom look). Default is `false` unless Tron theme is active.
   */
  showGrid?: boolean
}

/**
 * Dark polished floor for the Showroom scene.
 */
export function ShowroomFloor({ showGrid }: FloorProps = {}) {
  const tron = resolveTronShowroom()
  const gridOn = showGrid ?? tron

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[16, 96]} />
        <meshStandardMaterial
          color={tron ? TRON.floor : '#050c18'}
          roughness={tron ? 0.12 : 0.38}
          metalness={tron ? 0.88 : 0.12}
          side={THREE.DoubleSide}
        />
      </mesh>

      {gridOn && <GridDisc tron={tron} />}
    </group>
  )
}

function GridDisc({ tron }: { tron: boolean }) {
  const reduced = useReducedMotion()
  const uniforms = useMemo(
    () => ({
      uMajor: { value: tron ? 1.0 : 1.0 },
      uMinor: { value: tron ? 0.5 : 0.5 },
      uMajorWidth: { value: tron ? 1.8 : 1.4 },
      uMinorWidth: { value: tron ? 1.0 : 0.8 },
      uMajorColor: { value: new THREE.Color(tron ? TRON.gridMajor : '#34557a') },
      uMinorColor: { value: new THREE.Color(tron ? TRON.gridMinor : '#1a283b') },
      uAccent: { value: new THREE.Color(tron ? TRON.cyan : '#02C8FF') },
      uFadeInner: { value: tron ? 11.5 : 10.5 },
      uFadeOuter: { value: tron ? 16.5 : 16.5 },
      uOverallAlpha: { value: tron ? 1.0 : 0.92 },
      uTime: { value: 0 },
      uTron: { value: tron ? 1 : 0 },
    }),
    [tron],
  )

  useFrame(({ clock }) => {
    if (reduced) return
    uniforms.uTime.value = clock.getElapsedTime()
  })

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.002, 0]}
      renderOrder={1}
    >
      <circleGeometry args={[16, 96]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={vert}
        fragmentShader={frag}
        side={THREE.DoubleSide}
        blending={tron ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </mesh>
  )
}

const vert = /* glsl */ `
  varying vec2 vWorldXZ;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldXZ = wp.xz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const frag = /* glsl */ `
  precision highp float;
  varying vec2 vWorldXZ;
  uniform float uMajor;
  uniform float uMinor;
  uniform float uMajorWidth;
  uniform float uMinorWidth;
  uniform vec3  uMajorColor;
  uniform vec3  uMinorColor;
  uniform vec3  uAccent;
  uniform float uFadeInner;
  uniform float uFadeOuter;
  uniform float uOverallAlpha;
  uniform float uTime;
  uniform float uTron;

  float gridLine(vec2 p, float spacing, float widthPx) {
    vec2 grid = p / spacing;
    vec2 d = abs(fract(grid - 0.5) - 0.5) / fwidth(grid);
    float line = min(d.x, d.y);
    return 1.0 - smoothstep(widthPx * 0.5, widthPx * 0.5 + 1.0, line);
  }

  float axisLine(float c, float widthPx) {
    float d = abs(c) / fwidth(c);
    return 1.0 - smoothstep(widthPx * 0.5, widthPx * 0.5 + 1.0, d);
  }

  void main() {
    float r = length(vWorldXZ);
    float fade = 1.0 - smoothstep(uFadeInner, uFadeOuter, r);
    if (fade <= 0.001) discard;

    float minor = gridLine(vWorldXZ, uMinor, uMinorWidth);
    float major = gridLine(vWorldXZ, uMajor, uMajorWidth);
    float ax = max(axisLine(vWorldXZ.x, 2.4), axisLine(vWorldXZ.y, 2.4));

    float pulse = 1.0;
    if (uTron > 0.5) {
      float wave = sin(uTime * 1.6 - r * 0.85) * 0.5 + 0.5;
      pulse = 0.72 + 0.28 * wave;
    }

    vec3 col = uMinorColor * minor * (uTron > 0.5 ? 0.85 : 0.6)
             + uMajorColor * major * (uTron > 0.5 ? 1.35 : 1.0)
             + uAccent     * ax    * (uTron > 0.5 ? 1.1 : 0.55);

    float alpha = clamp(
      max(max(minor * (uTron > 0.5 ? 0.65 : 0.45), major * (uTron > 0.5 ? 1.0 : 0.85)), ax * (uTron > 0.5 ? 0.95 : 0.55)),
      0.0, 1.0
    ) * fade * uOverallAlpha * pulse;

    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`
