import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Billboard } from '@react-three/drei'

/**
 * Renders a product photo as a 3D plane that always faces the camera.
 *
 * The plane is sized so its longest edge matches `targetSize`, preserving
 * the source image's aspect ratio. While the texture is still loading,
 * nothing is rendered — the caller is expected to either show a primitive
 * fallback or accept the brief gap.
 */
interface Props {
  url: string
  /** Longest-edge size in world units. Default ~1.2m. */
  targetSize?: number
  /** Selected styling tints the rim/glow. */
  selected?: boolean
}

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

export function PhotoBillboard({
  url,
  targetSize = 1.2,
  selected = false,
}: Props) {
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

  const [planeW, planeH] = useMemo<[number, number]>(() => {
    const image = texture?.image as
      | { width?: number; height?: number }
      | undefined
    if (!image?.width || !image?.height) return [targetSize, targetSize]
    const aspect = image.width / image.height
    if (aspect >= 1) return [targetSize, targetSize / aspect]
    return [targetSize * aspect, targetSize]
  }, [texture, targetSize])

  if (!texture) return null

  return (
    <Billboard follow lockX={false} lockY={false} lockZ={false}>
      {/* Soft halo behind selected items */}
      {selected && (
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[planeW * 1.08, planeH * 1.12]} />
          <meshBasicMaterial
            color="#049FD9"
            transparent
            opacity={0.18}
            depthWrite={false}
          />
        </mesh>
      )}
      <mesh>
        <planeGeometry args={[planeW, planeH]} />
        {/* alphaTest=0.5 + depthWrite=true means the opaque body of the
            device writes into the depth buffer, so things on the floor
            below (e.g. category rings) get correctly occluded by the
            actual silhouette of the product instead of the bounding
            plane. The soft anti-aliased rim is still discarded by the
            alpha test, so it doesn't introduce halo artifacts. */}
        <meshBasicMaterial
          map={texture}
          transparent
          alphaTest={0.5}
          depthWrite
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </Billboard>
  )
}
