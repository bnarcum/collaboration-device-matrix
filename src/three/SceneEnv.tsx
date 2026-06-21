import { ShowroomBackdrop } from './ShowroomBackdrop'
import { resolveTronShowroom, TRON } from '../theme/tronShowroom'

/** Shared lighting + ground used across the 3D scenes. */
export function SceneEnv() {
  const tron = resolveTronShowroom()

  return (
    <>
      <fog
        attach="fog"
        args={[tron ? TRON.void : '#051222', tron ? 6 : 10, tron ? 26 : 32]}
      />
      <ShowroomBackdrop />
      <ambientLight intensity={tron ? 0.14 : 0.42} />
      <directionalLight
        position={[6, 10, 5]}
        intensity={tron ? 0.55 : 1.35}
        castShadow={false}
      />
      <directionalLight
        position={[-5, 6, -4]}
        intensity={tron ? 0.35 : 0.55}
        color={TRON.cyanDim}
      />
      <pointLight
        position={[0, 5, 0]}
        intensity={tron ? 0.85 : 0.55}
        color={TRON.cyan}
        distance={20}
      />
      <pointLight
        position={[0, 0.4, 0]}
        intensity={tron ? 1.1 : 0.28}
        color={TRON.cyan}
        distance={tron ? 18 : 14}
      />
      <pointLight
        position={[0, 2, 8]}
        intensity={tron ? 0.4 : 0.28}
        color={tron ? TRON.orange : '#0A60FF'}
        distance={14}
      />
    </>
  )
}
