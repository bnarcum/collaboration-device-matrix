import { lazy, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import type { Category, Device, RoomSize } from '../data/types'

const ShowroomScene = lazy(() =>
  import('../scenes/ShowroomScene').then((m) => ({ default: m.ShowroomScene })),
)
const AisleScene = lazy(() =>
  import('../scenes/AisleScene').then((m) => ({ default: m.AisleScene })),
)
const FinderScene = lazy(() =>
  import('../scenes/FinderScene').then((m) => ({ default: m.FinderScene })),
)

type Mode = 'showroom' | 'showcase' | 'finder'

function cameraFor(mode: Mode): [number, number, number] {
  switch (mode) {
    case 'showroom':
      return [9, 6, 9]
    case 'showcase':
      return [0, 5, 14]
    case 'finder':
      return [0, 4.5, 9]
  }
}

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
  catalog: Device[]
  selected: Device | null
  onSelect: (d: Device) => void
  filter: Category | 'all'
  finderStep: 0 | 1 | 2
  finderFilter: { roomSize?: RoomSize; category?: Category }
}

export function ModeViewport({
  mode,
  visibleDevices,
  catalog,
  selected,
  onSelect,
  filter,
  finderStep,
  finderFilter,
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

  return (
    <Canvas
      camera={{ position: cameraFor(mode), fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
    >
      <Suspense fallback={null}>
        {mode === 'showroom' && (
          <ShowroomScene
            devices={visibleDevices}
            selected={selected}
            onSelect={onSelect}
          />
        )}
        {mode === 'finder' && (
          <FinderScene
            devices={catalog}
            selected={selected}
            step={finderStep}
            filter={finderFilter}
            onSelect={onSelect}
          />
        )}
      </Suspense>
    </Canvas>
  )
}
