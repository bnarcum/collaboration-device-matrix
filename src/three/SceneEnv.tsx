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
      <ambientLight intensity={tron ? 0.28 : 0.32} color={tron ? '#eef6ff' : '#d8e8ff'} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={tron ? 0.42 : 0.48}
        castShadow={false}
      />
      <directionalLight
        position={[-6, 8, -5]}
        intensity={tron ? 0.12 : 0.18}
        color={TRON.cyanDim}
      />
    </>
  )
}
