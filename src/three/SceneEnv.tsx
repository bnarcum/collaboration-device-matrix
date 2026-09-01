import { ShowroomBackdrop } from './ShowroomBackdrop'
import { resolveTronShowroom, TRON } from '../theme/tronShowroom'

interface SceneEnvProps {
  /** World radius that must stay visible (All-view rings grow past the old 18 m floor). */
  extent?: number
}

/** Shared lighting + ground used across the 3D scenes. */
export function SceneEnv({ extent = 18 }: SceneEnvProps = {}) {
  const tron = resolveTronShowroom()
  const fogFar = Math.max(tron ? 26 : 32, extent * 2.15)
  const fogNear = tron ? Math.min(8, fogFar * 0.22) : Math.min(12, fogFar * 0.28)

  return (
    <>
      <fog
        attach="fog"
        args={[tron ? TRON.void : '#051222', fogNear, fogFar]}
      />
      <ShowroomBackdrop radius={Math.max(22, extent * 1.55)} />
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
