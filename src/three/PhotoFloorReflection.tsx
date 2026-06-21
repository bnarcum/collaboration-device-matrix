import { useEffect, useMemo, useState } from 'react'
import { Billboard } from '@react-three/drei'
import * as THREE from 'three'

const loader = new THREE.TextureLoader()
loader.setCrossOrigin('anonymous')

const cache = new Map<string, THREE.Texture>()

function loadTexture(url: string): Promise<THREE.Texture> {
  const existing = cache.get(url)
  if (existing) return Promise.resolve(existing)
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace
        t.anisotropy = 8
        t.minFilter = THREE.LinearMipmapLinearFilter
        t.generateMipmaps = true
        cache.set(url, t)
        resolve(t)
      },
      undefined,
      reject,
    )
  })
}

interface Props {
  url: string
  planeW: number
  planeH: number
}

/**
 * Camera-facing mirror of the product photo, anchored at floor level.
 *
 * A horizontal floor plane reads edge-on from the default orbit camera, so
 * we use a vertical billboard sitting on the floor (same trick as Apple-style
 * product pages) with a vertical flip + fade toward the floor edge.
 */
export function PhotoFloorReflection({ url, planeW, planeH }: Props) {
  const [texture, setTexture] = useState<THREE.Texture | null>(
    () => cache.get(url) ?? null,
  )

  useEffect(() => {
    let alive = true
    if (cache.get(url)) {
      setTexture(cache.get(url)!)
      return
    }
    loadTexture(url)
      .then((t) => {
        if (alive) setTexture(t)
      })
      .catch(() => {
        if (alive) setTexture(null)
      })
    return () => {
      alive = false
    }
  }, [url])

  const uniforms = useMemo(
    () => ({
      uMap: { value: null as THREE.Texture | null },
      uOpacity: { value: 0.55 },
    }),
    [],
  )

  useEffect(() => {
    uniforms.uMap.value = texture
  }, [texture, uniforms])

  if (!texture) return null

  return (
    <Billboard follow lockX={false} lockY={false} lockZ={false}>
      <mesh position={[0, -planeH / 2, -0.02]} renderOrder={2}>
        <planeGeometry args={[planeW, planeH]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          toneMapped={false}
          uniforms={uniforms}
          vertexShader={vert}
          fragmentShader={frag}
          side={THREE.DoubleSide}
        />
      </mesh>
    </Billboard>
  )
}

const vert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const frag = /* glsl */ `
  precision highp float;
  uniform sampler2D uMap;
  uniform float uOpacity;
  varying vec2 vUv;

  void main() {
    // Flip vertically — mirror of the hero above.
    vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
    vec4 tex = texture2D(uMap, uv);
    if (tex.a < 0.04) discard;
    // vUv.y = 1 at the pedestal contact line; fade toward the floor edge.
    float fade = smoothstep(0.0, 0.92, vUv.y);
    float a = tex.a * uOpacity * fade;
    if (a < 0.02) discard;
    gl_FragColor = vec4(tex.rgb * 0.82, a);
  }
`
