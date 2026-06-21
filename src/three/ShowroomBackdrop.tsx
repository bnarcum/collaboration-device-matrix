import * as THREE from 'three'

/**
 * Wireframe dome + horizon rings behind the showroom — visible stage depth
 * without competing with devices on the reflective floor.
 */
export function ShowroomBackdrop() {
  return (
    <group position={[0, -0.05, 0]}>
      <mesh>
        <icosahedronGeometry args={[22, 3]} />
        <meshBasicMaterial
          color="#2a7ab8"
          wireframe
          transparent
          opacity={0.16}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
      <mesh scale={0.92}>
        <icosahedronGeometry args={[22, 2]} />
        <meshBasicMaterial
          color="#02C8FF"
          wireframe
          transparent
          opacity={0.09}
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[14.5, 15.2, 128]} />
        <meshBasicMaterial
          color="#02C8FF"
          transparent
          opacity={0.1}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[10.5, 10.85, 96]} />
        <meshBasicMaterial
          color="#0A60FF"
          transparent
          opacity={0.06}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
