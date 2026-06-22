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
      <ambientLight intensity={tron ? 0.22 : 0.42} color={tron ? '#eef6ff' : '#ffffff'} />
      <directionalLight
        position={[6, 10, 5]}
        intensity={tron ? 0.75 : 1.35}
        castShadow={false}
      />
      {tron && (
        <directionalLight
          position={[10, 14, 12]}
          intensity={0.85}
          color="#ffffff"
        />
      )}
      <directionalLight
        position={[-5, 6, -4]}
        intensity={tron ? 0.22 : 0.55}
        color={TRON.cyanDim}
      />
      <pointLight
        position={[4, 4, 6]}
        intensity={tron ? 0.28 : 0.22}
        color={tron ? TRON.orange : '#0A60FF'}
        distance={16}
      />
    </>
  )
}
