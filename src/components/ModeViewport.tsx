import { lazy, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import type { Category, Device } from '../data/types'
import type { ShowroomFocusMode } from '../three/ShowroomCameraFocus'
import { resolveTronShowroom, TRON } from '../theme/tronShowroom'

const ShowroomScene = lazy(() =>
  import('../scenes/ShowroomScene').then((m) => ({ default: m.ShowroomScene })),
)
const AisleScene = lazy(() =>
  import('../scenes/AisleScene').then((m) => ({ default: m.AisleScene })),
)

type Mode = 'showroom' | 'showcase'

function SceneFallback() {
  return (
    <div className="scene-loading" role="status" aria-live="polite">
      Loading view…
    </div>
  )
}

interface Props {
  mode: Mode
  visibleDevices: Device[]
  selected: Device | null
  onSelect: (d: Device) => void
  filter: Category | 'all'
  showroomFocus?: ShowroomFocusMode
}

export function ModeViewport({
  mode,
  visibleDevices,
  selected,
  onSelect,
  filter,
  showroomFocus = 'ring',
}: Props) {
  if (mode === 'showcase') {
    return (
      <Suspense fallback={<SceneFallback />}>
        <AisleScene
          devices={visibleDevices}
          selected={selected}
          onSelect={onSelect}
          filter={filter}
        />
      </Suspense>
    )
  }

  const tron = resolveTronShowroom()

  return (
    <Canvas
      camera={{ position: [9, 6, 9], fov: 45 }}
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: !tron,
        powerPreference: 'high-performance',
      }}
      style={{ background: tron ? TRON.void : 'transparent' }}
    >
      <Suspense fallback={null}>
        <ShowroomScene
          devices={visibleDevices}
          filter={filter}
          selected={selected}
          onSelect={onSelect}
          focusMode={showroomFocus}
        />
      </Suspense>
    </Canvas>
  )
}
