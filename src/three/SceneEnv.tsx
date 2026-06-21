import { ContactShadows, Environment } from '@react-three/drei'
import { ShowroomBackdrop } from './ShowroomBackdrop'

/** Shared lighting + ground used across the 3D scenes. */
export function SceneEnv() {
  return (
    <>
      <color attach="background" args={['#051222']} />
      <fog attach="fog" args={['#051222', 10, 32]} />
      <ShowroomBackdrop />
      <ambientLight intensity={0.42} />
      <directionalLight
        position={[6, 10, 5]}
        intensity={1.35}
        castShadow={false}
      />
      <directionalLight
        position={[-5, 6, -4]}
        intensity={0.55}
        color="#02C8FF"
      />
      <pointLight position={[0, 5, 0]} intensity={0.55} color="#02C8FF" distance={20} />
      <pointLight position={[0, 2, 8]} intensity={0.28} color="#0A60FF" distance={14} />
      <Environment preset="city" />
      <ContactShadows
        position={[0, -0.001, 0]}
        opacity={0.55}
        scale={32}
        blur={2.5}
        far={5}
      />
    </>
  )
}
