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
 * Mirror image of a product photo on the showroom floor — laid flat on the
 * polished surface with a vertical UV flip and fade from the pedestal edge.
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
      uOpacity: { value: 0.68 },
    }),
    [],
  )

  useEffect(() => {
    uniforms.uMap.value = texture
  }, [texture, uniforms])

  if (!texture) return null

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.003, -planeH / 2]}
      renderOrder={2}
    >
      <planeGeometry args={[planeW, planeH]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        depthTest={true}
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
    // Mirror vertically so the image reads as a floor reflection.
    vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
    vec4 tex = texture2D(uMap, uv);
    if (tex.a < 0.08) discard;
    // Fade from the pedestal contact line (vUv.y = 1) toward the floor edge.
    float fade = smoothstep(0.0, 0.62, vUv.y);
    float a = tex.a * uOpacity * fade;
    if (a < 0.02) discard;
    gl_FragColor = vec4(tex.rgb * 0.9, a);
  }
`
