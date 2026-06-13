import { lazy, Suspense, useCallback, useEffect, useMemo } from 'react'
import type { CSSProperties } from 'react'
import {
  DEVICES,
  devicesForVendors,
  normalizeVendorSelection,
} from './data/catalog'
import { ModeViewport } from './components/ModeViewport'
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  ROOM_SIZE_ORDER,
  VENDOR_LABELS,
  VENDOR_ORDER,
} from './data/types'
import type { Category, Device, RoomSize, VendorId } from './data/types'
import { VENDORS } from './data/vendors'
import { DeviceDrawer } from './ui/DeviceDrawer'
import { CompareTray } from './ui/CompareTray'
import { CompareModal } from './ui/CompareModal'
import type { FinderState } from './ui/FinderOverlay'

const FinderOverlay = lazy(() =>
  import('./ui/FinderOverlay').then((m) => ({ default: m.FinderOverlay })),
)
import { SearchBar } from './ui/SearchBar'
import { PlatformSwitch } from './ui/PlatformSwitch'
import {
  filterDevicesByPlatform,
  MEETING_PLATFORM_ORDER,
  type MeetingPlatformId,
} from './data/platforms'
import {
  enumCodec,
  enumArrayCodec,
  idArrayCodec,
  idCodec,
  useUrlState,
  vendorSelectionCodec,
} from './hooks/useUrlState'

type Mode = 'showroom' | 'showcase' | 'finder'
const MODES: readonly Mode[] = ['showroom', 'showcase', 'finder']

const DEFAULT_VENDORS: VendorId[] = ['cisco']

const MAX_COMPARE = 3

const DEVICES_BY_ID = new Map(DEVICES.map((d) => [d.id, d]))

const FILTER_VALUES: readonly (Category | 'all')[] = ['all', ...CATEGORY_ORDER]

export default function App() {
  const [selectedVendors, setSelectedVendors] = useUrlState<VendorId[]>(
    'vendor',
    DEFAULT_VENDORS,
    vendorSelectionCodec(VENDOR_ORDER, DEFAULT_VENDORS),
  )
  const [mode, setMode] = useUrlState<Mode>(
    'view',
    'showroom',
    enumCodec(MODES, 'showroom'),
  )
  const [selectedId, setSelectedId] = useUrlState<string | null>(
    'device',
    null,
    idCodec,
  )
  const [filter, setFilter] = useUrlState<Category | 'all'>(
    'filter',
    'all',
    enumCodec(FILTER_VALUES, 'all'),
  )
  const [roomSize, setRoomSize] = useUrlState<RoomSize | null>(
    'room',
    null,
    enumCodec(ROOM_SIZE_ORDER, null),
  )
  const [finderForRaw, setFinderForRaw] = useUrlState<string | null>(
    'for',
    null,
    enumCodec(['any', ...CATEGORY_ORDER], null),
  )
  const [compareIds, setCompareIds] = useUrlState<string[]>(
    'compare',
    [],
    idArrayCodec,
  )
  const [compareOpen, setCompareOpenRaw] = useUrlState<boolean>(
    'compareOpen',
    false,
    {
      parse: (raw) => raw === '1',
      serialize: (v) => (v ? '1' : null),
    },
  )
  const [selectedPlatforms, setSelectedPlatforms] = useUrlState<
    MeetingPlatformId[]
  >('platform', [], enumArrayCodec(MEETING_PLATFORM_ORDER))
  const [platformInterop, setPlatformInterop] = useUrlState<boolean>(
    'platformInterop',
    false,
    {
      parse: (raw) => raw === '1',
      serialize: (v) => (v ? '1' : null),
    },
  )

  const catalog = useMemo(
    () => devicesForVendors(selectedVendors),
    [selectedVendors],
  )

  const allVendorsSelected = useMemo(
    () =>
      VENDOR_ORDER.every((v) => selectedVendors.includes(v)) &&
      selectedVendors.length === VENDOR_ORDER.length,
    [selectedVendors],
  )

  const toggleVendor = useCallback((v: VendorId) => {
    setSelectedVendors((prev) => {
      const norm = normalizeVendorSelection(prev, VENDOR_ORDER)
      if (norm.includes(v)) {
        const next = norm.filter((id) => id !== v)
        return next.length === 0 ? norm : next
      }
      return normalizeVendorSelection([...norm, v], VENDOR_ORDER)
    })
  }, [setSelectedVendors])

  const toggleAllVendors = useCallback(() => {
    setSelectedVendors((prev) => {
      const norm = normalizeVendorSelection(prev, VENDOR_ORDER)
      if (norm.length === VENDOR_ORDER.length) return [...DEFAULT_VENDORS]
      return [...VENDOR_ORDER]
    })
  }, [setSelectedVendors])

  const resetVendors = useCallback(() => {
    setSelectedVendors([...DEFAULT_VENDORS])
  }, [setSelectedVendors])

  const ciscoInSelection = selectedVendors.includes('cisco')

  const togglePlatform = useCallback((p: MeetingPlatformId) => {
    setSelectedPlatforms((prev) => {
      if (prev.includes(p)) return prev.filter((id) => id !== p)
      return [...prev, p]
    })
  }, [setSelectedPlatforms])

  const toggleAllPlatforms = useCallback(() => {
    setSelectedPlatforms((prev) =>
      prev.length === MEETING_PLATFORM_ORDER.length ? [] : [...MEETING_PLATFORM_ORDER],
    )
  }, [setSelectedPlatforms])

  useEffect(() => {
    if (selectedId !== null && !DEVICES_BY_ID.has(selectedId)) {
      setSelectedId(null)
    }
    setCompareIds((prev) => {
      const cleaned: string[] = []
      const seen = new Set<string>()
      for (const id of prev) {
        if (!DEVICES_BY_ID.has(id)) continue
        if (seen.has(id)) continue
        seen.add(id)
        cleaned.push(id)
        if (cleaned.length >= MAX_COMPARE) break
      }
      const same =
        cleaned.length === prev.length && cleaned.every((v, i) => prev[i] === v)
      return same ? prev : cleaned
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedId && !catalog.some((d) => d.id === selectedId)) {
      setSelectedId(null)
    }
  }, [catalog, selectedId, setSelectedId])

  useEffect(() => {
    const catalogIds = new Set(catalog.map((d) => d.id))
    setCompareIds((prev) => {
      const next = prev.filter((id) => catalogIds.has(id))
      return next.length === prev.length ? prev : next
    })
  }, [catalog, setCompareIds])

  const selected: Device | null = useMemo(
    () => (selectedId ? DEVICES_BY_ID.get(selectedId) ?? null : null),
    [selectedId],
  )

  const compare: Device[] = useMemo(
    () =>
      compareIds
        .map((id) => DEVICES_BY_ID.get(id))
        .filter((d): d is Device => !!d),
    [compareIds],
  )

  const finderState: FinderState = useMemo(() => {
    if (!roomSize) return { step: 0 }
    if (finderForRaw === null) return { step: 1, roomSize }
    return {
      step: 2,
      roomSize,
      category:
        finderForRaw === 'any' ? undefined : (finderForRaw as Category),
    }
  }, [roomSize, finderForRaw])

  const setFinderState = useCallback(
    (s: FinderState) => {
      if (s.step === 0) {
        setRoomSize(null)
        setFinderForRaw(null)
      } else if (s.step === 1) {
        setRoomSize(s.roomSize ?? null)
        setFinderForRaw(null)
      } else {
        setRoomSize(s.roomSize ?? null)
        setFinderForRaw(s.category ?? 'any')
      }
    },
    [setRoomSize, setFinderForRaw],
  )

  const visibleDevices = useMemo(() => {
    const byCategory =
      filter === 'all'
        ? catalog
        : catalog.filter((d) => d.category === filter)
    if (!ciscoInSelection || selectedPlatforms.length === 0) {
      return byCategory
    }
    return filterDevicesByPlatform(
      byCategory,
      selectedPlatforms,
      platformInterop,
    )
  }, [
    catalog,
    filter,
    ciscoInSelection,
    selectedPlatforms,
    platformInterop,
  ])

  const selectDevice = useCallback(
    (d: Device | null) => {
      setSelectedId(d?.id ?? null)
    },
    [setSelectedId],
  )

  const toggleCompare = useCallback(
    (d: Device) => {
      setCompareIds((prev) => {
        const exists = prev.includes(d.id)
        if (exists) return prev.filter((id) => id !== d.id)
        if (prev.length >= MAX_COMPARE) return prev
        return [...prev, d.id]
      })
    },
    [setCompareIds],
  )

  const setCompareOpen = useCallback(
    (open: boolean) => setCompareOpenRaw(open),
    [setCompareOpenRaw],
  )

  const solePartnerVendor = useMemo((): VendorId | null => {
    if (selectedVendors.length !== 1) return null
    const only = selectedVendors[0]
    return only === 'logitech' || only === 'poly' || only === 'neat'
      ? only
      : null
  }, [selectedVendors])

  const activeVendorTheme = solePartnerVendor
    ? VENDORS[solePartnerVendor]
    : null

  const partnerVendors = useMemo(
    () =>
      selectedVendors.filter(
        (v): v is 'logitech' | 'poly' | 'neat' =>
          v === 'logitech' || v === 'poly' || v === 'neat',
      ),
    [selectedVendors],
  )

  useEffect(() => {
    const base =
      'Collaboration Device Matrix · Cisco · Logitech · Poly · Neat'
    document.title = selected ? `${selected.name} · ${base}` : base
  }, [selected])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = document.activeElement as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      const editable =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        target?.isContentEditable === true
      if (e.key === 'Escape') {
        if (compareOpen) {
          setCompareOpen(false)
          e.preventDefault()
          return
        }
        if (selected) {
          selectDevice(null)
          e.preventDefault()
          return
        }
      }
      if (editable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      if (!selected) return
      const peers = catalog.filter((d) => d.category === selected.category)
      if (peers.length === 0) return
      const idx = peers.findIndex((d) => d.id === selected.id)
      if (idx < 0) return
      const dir = e.key === 'ArrowRight' ? 1 : -1
      const next = peers[(idx + dir + peers.length) % peers.length]
      selectDevice(next)
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, selectDevice, compareOpen, setCompareOpen, catalog])

  return (
    <div
      className="app"
      data-vendors={selectedVendors.join(',')}
      style={
        activeVendorTheme
          ? ({
              '--brand-primary': activeVendorTheme.primary,
              '--brand-secondary': activeVendorTheme.secondary,
            } as CSSProperties)
          : undefined
      }
    >
      <header className="topbar">
        <div className="brand">
          <div className="brand-logo" aria-hidden>
            ⩕
          </div>
          <div>
            <div className="brand-title">Collaboration Device Matrix</div>
            <div className="brand-sub">
              Cisco · compare Logitech, Poly &amp; Neat
            </div>
          </div>
        </div>
        <nav className="vendor-switch" role="group" aria-label="Manufacturers">
          {VENDOR_ORDER.map((v) => {
            const on = selectedVendors.includes(v)
            return (
              <button
                key={v}
                type="button"
                data-active={on ? 'true' : 'false'}
                aria-pressed={on}
                onClick={() => toggleVendor(v)}
              >
                {VENDOR_LABELS[v]}
              </button>
            )
          })}
          <button
            type="button"
            className="vendor-switch-all"
            data-active={allVendorsSelected ? 'true' : 'false'}
            aria-pressed={allVendorsSelected}
            title={
              allVendorsSelected
                ? 'Show Cisco only'
                : 'Select all manufacturers'
            }
            onClick={toggleAllVendors}
          >
            All
          </button>
          <button
            type="button"
            className="vendor-switch-reset"
            title="Reset to Cisco only"
            onClick={resetVendors}
          >
            Reset
          </button>
        </nav>
        <nav className="mode-switch" aria-label="View mode">
          <button
            data-active={mode === 'showroom' ? 'true' : 'false'}
            onClick={() => setMode('showroom')}
          >
            Showroom
          </button>
          <button
            data-active={mode === 'showcase' ? 'true' : 'false'}
            onClick={() => setMode('showcase')}
          >
            Aisle
          </button>
          <button
            data-active={mode === 'finder' ? 'true' : 'false'}
            onClick={() => setMode('finder')}
          >
            Finder
          </button>
        </nav>
        <SearchBar devices={catalog} onSelect={(d) => selectDevice(d)} />
        <div className="topbar-actions">
          <a
            className="source-link"
            href="https://www.webex.com/content/dam/wbx/us/documents/pdf/Collaboration_Device_Product_Matrix_Brochure.pdf"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open the official Cisco/Webex Collaboration Device Product Matrix source document (PDF, opens in a new tab)"
            title="Collaboration Device Product Matrix (PDF)"
          >
            <span className="source-link-icon" aria-hidden>
              ⤓
            </span>
            <span className="source-link-text">
              <span className="source-link-label">Source Document</span>
              <span className="source-link-meta">Cisco · Webex · PDF</span>
            </span>
          </a>
          <a
            className="source-link"
            href="https://roomos.cisco.com/doc/Welcome/Welcome"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open Cisco RoomOS documentation (opens in a new tab)"
            title="Cisco RoomOS documentation"
          >
            <span className="source-link-icon" aria-hidden>
              ⊞
            </span>
            <span className="source-link-text">
              <span className="source-link-label">Cisco RoomOS ↗</span>
              <span className="source-link-meta">Device documentation</span>
            </span>
          </a>
          <a
            className="designer-link"
            href="https://designer.webex.com/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open Cisco Workspace Designer to plan a room (opens in a new tab)"
            title="Open Cisco Workspace Designer"
          >
            <span className="designer-link-icon" aria-hidden>
              ⌗
            </span>
            <span className="designer-link-text">
              <span className="designer-link-label">Cisco Workspace Designer ↗</span>
              <span className="designer-link-meta">Plan a room</span>
            </span>
          </a>
          {partnerVendors.map((partnerVendor) => {
            const cfg = VENDORS[partnerVendor]
            const link = cfg.resourceLinks[0]
            if (!link) return null
            return (
              <a
                key={partnerVendor}
                className="source-link"
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${link.label} (opens in a new tab)`}
                title={link.label}
              >
                <span className="source-link-icon" aria-hidden>
                  {link.icon ?? '↗'}
                </span>
                <span className="source-link-text">
                  <span className="source-link-label">{link.label}</span>
                  <span className="source-link-meta">{cfg.name}</span>
                </span>
              </a>
            )
          })}
        </div>
        {ciscoInSelection && (
          <PlatformSwitch
            selected={selectedPlatforms}
            includeInterop={platformInterop}
            onToggle={togglePlatform}
            onToggleAll={toggleAllPlatforms}
            onIncludeInteropChange={setPlatformInterop}
          />
        )}
      </header>

      <div className="canvas-wrap">
        <ModeViewport
          mode={mode}
          visibleDevices={visibleDevices}
          catalog={catalog}
          selected={selected}
          onSelect={(d) => selectDevice(d)}
          filter={filter}
          finderStep={finderState.step}
          finderFilter={{
            roomSize: finderState.roomSize,
            category: finderState.category,
          }}
        />

        <div className="overlay">
          {(mode === 'showroom' || mode === 'showcase') && (
            <Filters value={filter} onChange={setFilter} />
          )}
          {mode === 'finder' && (
            <Suspense fallback={null}>
              <FinderOverlay state={finderState} setState={setFinderState} />
            </Suspense>
          )}
          <CompareTray
            items={compare}
            onRemove={(d) => toggleCompare(d)}
            onOpen={(d) => selectDevice(d)}
            onCompareAll={() => setCompareOpen(true)}
          />
        </div>

        <DeviceDrawer
          device={selected}
          onClose={() => selectDevice(null)}
          inCompare={!!selected && compare.some((c) => c.id === selected.id)}
          canAddCompare={compare.length < MAX_COMPARE}
          onToggleCompare={toggleCompare}
        />

        <CompareModal
          items={compare}
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
        />
      </div>
    </div>
  )
}

function Filters({
  value,
  onChange,
}: {
  value: Category | 'all'
  onChange: (c: Category | 'all') => void
}) {
  return (
    <div className="filters" role="toolbar" aria-label="Category filter">
      <button
        data-active={value === 'all' ? 'true' : 'false'}
        onClick={() => onChange('all')}
      >
        All
      </button>
      {CATEGORY_ORDER.map((c) => (
        <button
          key={c}
          data-active={value === c ? 'true' : 'false'}
          onClick={() => onChange(c)}
        >
          {CATEGORY_LABELS[c]}
        </button>
      ))}
    </div>
  )
}
