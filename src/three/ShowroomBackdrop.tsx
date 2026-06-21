import * as THREE from 'three'

/**
 * Subtle wireframe dome behind the showroom — adds depth without competing
 * with devices or the reflective floor (inspired by polished stage renders).
 */
export function ShowroomBackdrop() {
  return (
    <group position={[0, -0.05, 0]}>
      <mesh>
        <icosahedronGeometry args={[22, 2]} />
        <meshBasicMaterial
          color="#1a4a6e"
          wireframe
          transparent
          opacity={0.07}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[14.5, 15.2, 128]} />
        <meshBasicMaterial
          color="#02C8FF"
          transparent
          opacity={0.04}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
