import * as THREE from 'three'
import { MAGNETIC } from '../theme/magnetic'
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
          color={tron ? TRON.cyanDim : MAGNETIC.dome}
          wireframe
          transparent
          opacity={tron ? 0.32 : 0.12}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
      {tron && (
        <>
          <mesh scale={0.92}>
            <icosahedronGeometry args={[r, 2]} />
            <meshBasicMaterial
              color={TRON.cyan}
              wireframe
              transparent
              opacity={0.2}
              depthWrite={false}
              side={THREE.BackSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
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
        </>
      )}
    </group>
  )
}
