import { useEffect, useState } from 'react'
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
 * World-horizontal floor mirror — parent group rotates toward ring center.
 * Extends from the pedestal contact line (local z = 0) inward (local −z).
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

  const mirrorMap = useMirrorTexture(texture)

  if (!mirrorMap || planeH <= 0 || planeW <= 0) return null

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.012, -planeH / 2]}
      renderOrder={10}
      frustumCulled={false}
    >
      <planeGeometry args={[planeW, planeH]} />
      <meshBasicMaterial
        map={mirrorMap}
        transparent
        opacity={0.58}
        alphaTest={0.28}
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
        fog={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function useMirrorTexture(source: THREE.Texture | null) {
  const [mirrored, setMirrored] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    if (!source) {
      setMirrored(null)
      return
    }
    const clone = source.clone()
    clone.repeat.y = -1
    clone.offset.y = 1
    clone.needsUpdate = true
    setMirrored(clone)
    return () => clone.dispose()
  }, [source])

  return mirrored
}
