import { useMemo } from 'react'
import * as THREE from 'three'
import { MeshReflectorMaterial } from '@react-three/drei'

interface FloorProps {
  /**
   * When true, overlays a procedural anti-aliased grid (the original
   * showroom look). Default is `false`; the floor itself reads cleanly
   * thanks to the reflection alone.
   */
  showGrid?: boolean
}

/**
 * Polished floor used by both the Showroom and Finder scenes.
 *
 * Base layer is a wide MeshReflectorMaterial disc that gives a whisper-
 * faint reflection so pedestals feel anchored to the ground instead of
 * floating. Material is rendered DoubleSide so a stray under-floor camera
 * angle never sees through the world.
 *
 * Optional grid overlay (off by default) renders a procedural shader grid
 * with fwidth() anti-aliasing, dual spacing, Cisco-blue cardinal axes,
 * and a radial fade so lines dissolve toward the horizon.
 */
export function ShowroomFloor({ showGrid = false }: FloorProps = {}) {
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[16, 96]} />
        <MeshReflectorMaterial
          color="#070c16"
          roughness={0.85}
          metalness={0.15}
          blur={[400, 100]}
          resolution={512}
          mixBlur={1.2}
          mixStrength={0.55}
          mixContrast={1}
          mirror={0.35}
          depthScale={0.4}
          minDepthThreshold={0.7}
          maxDepthThreshold={1.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {showGrid && <GridDisc />}
    </group>
  )
}

function GridDisc() {
  const uniforms = useMemo(
    () => ({
      uMajor: { value: 1.0 },
      uMinor: { value: 0.5 },
      uMajorWidth: { value: 1.4 },
      uMinorWidth: { value: 0.8 },
      uMajorColor: { value: new THREE.Color('#34557a') },
      uMinorColor: { value: new THREE.Color('#1a283b') },
      uAccent: { value: new THREE.Color('#049fd9') },
      uFadeInner: { value: 8.5 },
      uFadeOuter: { value: 15.0 },
      uOverallAlpha: { value: 0.95 },
    }),
    [],
  )

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
      />
    </mesh>
  )
}

const vert = /* glsl */ `
  varying vec2 vWorldXZ;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    // The mesh is rotated -PI/2 on X so its local XY maps to world XZ.
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

  // Crisp anti-aliased grid line intensity. Returns 1 on a line, 0 elsewhere.
  float gridLine(vec2 p, float spacing, float widthPx) {
    vec2 grid = p / spacing;
    vec2 d = abs(fract(grid - 0.5) - 0.5) / fwidth(grid);
    float line = min(d.x, d.y);
    return 1.0 - smoothstep(widthPx * 0.5, widthPx * 0.5 + 1.0, line);
  }

  // Same idea but along a single axis (used for cardinal accent).
  float axisLine(float c, float widthPx) {
    float d = abs(c) / fwidth(c);
    return 1.0 - smoothstep(widthPx * 0.5, widthPx * 0.5 + 1.0, d);
  }

  void main() {
    float r = length(vWorldXZ);

    // Radial fade: lines visible inside uFadeInner, dissolve by uFadeOuter.
    float fade = 1.0 - smoothstep(uFadeInner, uFadeOuter, r);
    if (fade <= 0.001) discard;

    float minor = gridLine(vWorldXZ, uMinor, uMinorWidth);
    float major = gridLine(vWorldXZ, uMajor, uMajorWidth);

    // Cardinal axes get a Cisco-blue accent.
    float ax = max(axisLine(vWorldXZ.x, 2.4), axisLine(vWorldXZ.y, 2.4));

    // Compose: minors first, majors on top, accent strongest.
    vec3 col = uMinorColor * minor * 0.6
             + uMajorColor * major * 1.0
             + uAccent     * ax    * 0.55;

    float alpha = clamp(
      max(max(minor * 0.45, major * 0.85), ax * 0.55),
      0.0, 1.0
    ) * fade * uOverallAlpha;

    if (alpha < 0.01) discard;
    gl_FragColor = vec4(col, alpha);
  }
`
