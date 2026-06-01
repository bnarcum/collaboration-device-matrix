import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Billboard } from '@react-three/drei'
import {
  computeBillboardPlane,
  type BillboardPlane,
} from './billboardSizing'

/**
 * Renders a product photo as a 3D plane that always faces the camera.
 *
 * Photos are fit to catalog display width/height (see billboardSizing.ts):
 * landscape heroes scale to display width, portrait heroes to display height.
 */
interface Props {
  url: string
  /** Catalog display width & height in world units (device.size[0/1]). */
  displaySize: [number, number]
  photoScale?: number
  pedestalScale?: number
  /** Known width ÷ height before the texture loads. */
  aspectHint?: number
  selected?: boolean
  onPlaneSize?: (plane: BillboardPlane) => void
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

function imageAspect(texture: THREE.Texture | null, hint?: number): number {
  const image = texture?.image as { width?: number; height?: number } | undefined
  if (image?.width && image?.height) return image.width / image.height
  return hint ?? 1
}

export function PhotoBillboard({
  url,
  displaySize,
  photoScale = 1,
  pedestalScale = 1,
  aspectHint,
  selected = false,
  onPlaneSize,
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

  const plane = useMemo(() => {
    const aspect = imageAspect(texture, aspectHint)
    return computeBillboardPlane(displaySize[0], displaySize[1], aspect, {
      photoScale,
      pedestalScale,
    })
  }, [texture, aspectHint, displaySize, photoScale, pedestalScale])

  useEffect(() => {
    onPlaneSize?.(plane)
  }, [plane, onPlaneSize])

  if (!texture) return null

  const { planeW, planeH } = plane

  return (
    <Billboard follow lockX={false} lockY={false} lockZ={false}>
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
