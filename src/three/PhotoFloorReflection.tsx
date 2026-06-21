import { useEffect, useMemo, useState } from 'react'
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
 * Mirror image of a product photo on the showroom floor — flipped across y=0
 * with a vertical fade so it reads as a real reflection, not a glow disc.
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
      uOpacity: { value: 0.52 },
    }),
    [],
  )

  useEffect(() => {
    uniforms.uMap.value = texture
  }, [texture, uniforms])

  if (!texture) return null

  return (
    <mesh
      position={[0, -planeH / 2, 0]}
      scale={[1, -1, 1]}
      renderOrder={-1}
    >
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
    vec4 tex = texture2D(uMap, vUv);
    if (tex.a < 0.08) discard;
    // Fade toward the floor line (top of reflection plane in UV space).
    float fade = smoothstep(0.0, 0.55, vUv.y);
    float a = tex.a * uOpacity * fade;
    if (a < 0.02) discard;
    gl_FragColor = vec4(tex.rgb * 0.85, a);
  }
`
