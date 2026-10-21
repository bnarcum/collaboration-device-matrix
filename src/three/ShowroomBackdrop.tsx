import * as THREE from 'three'
import { resolveTronShowroom, TRON } from '../theme/tronShowroom'

/**
 * Wireframe dome + horizon rings behind the showroom — visible stage depth
 * without competing with devices on the reflective floor.
 */
export function ShowroomBackdrop({ radius = 22 }: { radius?: number }) {
  const tron = resolveTronShowroom()
  const r = Math.max(22, radius)

  return (
    <group position={[0, -0.05, 0]}>
      <mesh>
        <icosahedronGeometry args={[r, 3]} />
        <meshBasicMaterial
          color={tron ? TRON.cyanDim : '#2a7ab8'}
          wireframe
          transparent
          opacity={tron ? 0.32 : 0.16}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
      <mesh scale={0.92}>
        <icosahedronGeometry args={[r, 2]} />
        <meshBasicMaterial
          color={tron ? TRON.cyan : '#02C8FF'}
          wireframe
          transparent
          opacity={tron ? 0.2 : 0.09}
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {tron && (
        <mesh scale={0.78}>
          <icosahedronGeometry args={[r, 1]} />
          <meshBasicMaterial
            color={TRON.orange}
            wireframe
            transparent
            opacity={0.08}
            depthWrite={false}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  )
}
