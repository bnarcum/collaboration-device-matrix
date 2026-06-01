import { ContactShadows, Environment } from '@react-three/drei'

/** Shared lighting + ground used across the 3D scenes. */
export function SceneEnv() {
  return (
    <>
      <color attach="background" args={['#05080f']} />
      <fog attach="fog" args={['#05080f', 8, 28]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[6, 8, 4]}
        intensity={1.1}
        castShadow={false}
      />
      <directionalLight
        position={[-6, 4, -3]}
        intensity={0.4}
        color="#049FD9"
      />
      <Environment preset="city" />
      <ContactShadows
        position={[0, -0.001, 0]}
        opacity={0.4}
        scale={30}
        blur={2}
        far={4}
      />
    </>
  )
}
