import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Category, Device } from '../data/types'
import { CATEGORY_LABELS } from '../data/types'
import { deviceImage } from '../data/deviceImages'
import { useReducedMotion } from '../hooks/useReducedMotion'

interface Props {
  /** Already category-filtered list (mirrors what the 3D scenes receive). */
  devices: Device[]
  selected?: Device | null
  onSelect: (d: Device) => void
  /**
   * The current category filter ('all' or a single category). When 'all',
   * every section is visible. When set to a Category, only sections whose
   * category matches are visible — sections still appear side-by-side.
   */
  filter: Category | 'all'
}

/**
 * Section grouping for the aisle. A section is one shelf bay: a small
 * sign overhead + (usually) two stacked shelves of devices. Boards get a
 * special tall variant where the photo runs floor-to-sign-line.
 */
interface AisleSection {
  /** Stable id for keys / scroll targeting. */
  id: string
  /** Used for category filtering (matches `Device.category`). */
  category: Category
  label: string
  /** Boards: render as one tall shelf instead of two stacked. */
  tall?: boolean
  /** Devices on the top (smaller items) shelf. */
  top: Device[]
  /** Devices on the bottom (larger items) shelf. */
  bottom: Device[]
  /** Devices for the single tall shelf when `tall` is true. */
  full?: Device[]
}

/**
 * 2D horizontal "aisle" view. A long studio-floor scroller with two
 * stacked shelves split into category bays. Replaces the 3D Showcase
 * scene — cutout product photos render as plain `<img>` tags that
 * visibly sit on CSS shelves, with contact shadows + selection glows.
 */
export function AisleScene({ devices, selected, onSelect, filter }: Props) {
  const reducedMotion = useReducedMotion()
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const tileRefs = useRef<Map<string, HTMLElement>>(new Map())
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const sections = useMemo(() => buildSections(devices, filter), [devices, filter])

  /* ── Update chevron visibility on scroll ──────────────────────── */
  const updateChevrons = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setCanScrollLeft(el.scrollLeft > 1)
    setCanScrollRight(el.scrollLeft < max - 1)
  }, [])

  useEffect(() => {
    updateChevrons()
    const el = scrollerRef.current
    if (!el) return
    el.addEventListener('scroll', updateChevrons, { passive: true })
    const ro = new ResizeObserver(updateChevrons)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateChevrons)
      ro.disconnect()
    }
  }, [updateChevrons])

  // Re-check chevrons when the visible section list changes (filter/search).
  useEffect(() => {
    // Defer one frame so the new content has laid out.
    const id = requestAnimationFrame(updateChevrons)
    return () => cancelAnimationFrame(id)
  }, [sections, updateChevrons])

  /* ── Vertical wheel → horizontal scroll ───────────────────────── */
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      // Touchpads and Magic Mouse already send horizontal deltas; defer
      // to native handling for those so we don't double-up the velocity.
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
      if (e.deltaY === 0) return
      // Modifier-held wheels (e.g. Cmd/Ctrl-zoom) should not be hijacked.
      if (e.ctrlKey || e.metaKey) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  /* ── Arrow-key scrolling (only when nothing is selected/edited) ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      // Defer to App.tsx's peer-navigation handler when a device is open.
      if (selected) return
      const target = document.activeElement as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      const editable =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        target?.isContentEditable === true
      if (editable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = scrollerRef.current
      if (!el) return
      const dir = e.key === 'ArrowRight' ? 1 : -1
      el.scrollBy({
        left: dir * 320,
        behavior: reducedMotion ? 'auto' : 'smooth',
      })
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, reducedMotion])

  /* ── Bring the selected device into view ──────────────────────── */
  useEffect(() => {
    if (!selected) return
    const node = tileRefs.current.get(selected.id)
    if (!node) return
    node.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  }, [selected, reducedMotion])

  const scrollByPage = useCallback(
    (dir: 1 | -1) => {
      const el = scrollerRef.current
      if (!el) return
      const step = Math.max(280, el.clientWidth - 96)
      el.scrollBy({
        left: dir * step,
        behavior: reducedMotion ? 'auto' : 'smooth',
      })
    },
    [reducedMotion],
  )

  const registerTile = useCallback((id: string, node: HTMLElement | null) => {
    if (node) tileRefs.current.set(id, node)
    else tileRefs.current.delete(id)
  }, [])

  return (
    <div className="aisle-root" data-reduced-motion={reducedMotion ? 'true' : 'false'}>
      <div className="aisle-stage">
        <div className="aisle-scroller" ref={scrollerRef}>
          <div className="aisle-track">
            {sections.length === 0 ? (
              <div className="aisle-empty" role="status">
                No devices match the current filter.
              </div>
            ) : (
              sections.map((s) => (
                <SectionView
                  key={s.id}
                  section={s}
                  selectedId={selected?.id ?? null}
                  onSelect={onSelect}
                  registerTile={registerTile}
                />
              ))
            )}
          </div>
        </div>

        <div className="aisle-fade aisle-fade--left" aria-hidden="true" />
        <div className="aisle-fade aisle-fade--right" aria-hidden="true" />

        {canScrollLeft && (
          <button
            type="button"
            className="aisle-chevron aisle-chevron--left"
            aria-label="Scroll aisle left"
            onClick={() => scrollByPage(-1)}
          >
            <span aria-hidden>‹</span>
          </button>
        )}
        {canScrollRight && (
          <button
            type="button"
            className="aisle-chevron aisle-chevron--right"
            aria-label="Scroll aisle right"
            onClick={() => scrollByPage(1)}
          >
            <span aria-hidden>›</span>
          </button>
        )}
      </div>
      <div className="aisle-floor" aria-hidden="true" />
    </div>
  )
}

/* ─────────────── SectionView ─────────────── */

interface SectionViewProps {
  section: AisleSection
  selectedId: string | null
  onSelect: (d: Device) => void
  registerTile: (id: string, node: HTMLElement | null) => void
}

function SectionView({
  section,
  selectedId,
  onSelect,
  registerTile,
}: SectionViewProps) {
  if (section.tall) {
    const items = section.full ?? []
    return (
      <section
        className="aisle-section aisle-section--tall"
        aria-label={section.label}
      >
        <div className="aisle-sign">{section.label}</div>
        <div className="aisle-shelves">
          <div className="aisle-shelf aisle-shelf--full">
            <div className="aisle-shelf-surface">
              {items.map((d) => (
                <Tile
                  key={d.id}
                  device={d}
                  size="tall"
                  selected={selectedId === d.id}
                  onSelect={onSelect}
                  registerTile={registerTile}
                />
              ))}
            </div>
            <div className="aisle-shelf-plank">
              <div className="aisle-shelf-trim" />
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="aisle-section" aria-label={section.label}>
      <div className="aisle-sign">{section.label}</div>
      <div className="aisle-shelves">
        <div className="aisle-shelf aisle-shelf--top">
          <div className="aisle-shelf-surface">
            {section.top.map((d) => (
              <Tile
                key={d.id}
                device={d}
                size="small"
                selected={selectedId === d.id}
                onSelect={onSelect}
                registerTile={registerTile}
              />
            ))}
          </div>
          <div className="aisle-shelf-plank">
            <div className="aisle-shelf-trim" />
          </div>
        </div>
        <div className="aisle-shelf aisle-shelf--bottom">
          <div className="aisle-shelf-surface">
            {section.bottom.map((d) => (
              <Tile
                key={d.id}
                device={d}
                size="large"
                selected={selectedId === d.id}
                onSelect={onSelect}
                registerTile={registerTile}
              />
            ))}
          </div>
          <div className="aisle-shelf-plank">
            <div className="aisle-shelf-trim" />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────── Tile ─────────────── */

interface TileProps {
  device: Device
  size: 'small' | 'large' | 'tall'
  selected: boolean
  onSelect: (d: Device) => void
  registerTile: (id: string, node: HTMLElement | null) => void
}

function Tile({ device, size, selected, onSelect, registerTile }: TileProps) {
  const src = deviceImage(device.id)
  const ref = useCallback(
    (node: HTMLButtonElement | null) => registerTile(device.id, node),
    [device.id, registerTile],
  )

  return (
    <button
      ref={ref}
      type="button"
      className={`aisle-tile aisle-tile--${size}`}
      data-vendor={device.vendorId}
      data-selected={selected ? 'true' : 'false'}
      aria-label={`${device.name} — ${device.family}`}
      onClick={() => onSelect(device)}
    >
      <span className="aisle-tile-glow" aria-hidden="true" />
      <span className="aisle-tile-img-wrap">
        <span className="aisle-tile-shadow" aria-hidden="true" />
        {src ? (
          <img
            className="aisle-tile-img"
            src={src}
            alt=""
            loading="lazy"
            draggable={false}
          />
        ) : (
          <span className="aisle-tile-fallback" aria-hidden="true">
            {device.name}
          </span>
        )}
      </span>
      <span className="aisle-tile-caption">
        <span className="aisle-tile-name">{device.name}</span>
        <span className="aisle-tile-meta">
          {device.family} · {device.formFactor}
        </span>
      </span>
    </button>
  )
}

/* ─────────────── grouping helpers ─────────────── */

/** Approximate physical "volume" cue from the device.size triple. */
function volume(d: Device): number {
  return d.size[0] * d.size[1] * d.size[2]
}

/**
 * Order: largest volume first → small last. Used to group big-on-left,
 * small-on-right within each shelf, and to split flagship vs. companion
 * across the top/bottom shelves.
 */
function bySizeDesc(a: Device, b: Device): number {
  return volume(b) - volume(a)
}

/**
 * Split a sorted-largest-first device list into two shelves: bigger
 * (bottom) and smaller (top). For odd lengths the extra device goes
 * to the bottom shelf so the flagship rail stays denser.
 */
function splitShelves(sorted: Device[]): { top: Device[]; bottom: Device[] } {
  const cutoff = Math.ceil(sorted.length / 2)
  const bottom = sorted.slice(0, cutoff)
  const top = sorted.slice(cutoff)
  return { top, bottom }
}

/**
 * Build the section list for the aisle. Devices have already been
 * filtered by the active category chip (when set); we just bucket the
 * remaining list by section vocabulary and skip empties so the aisle
 * never renders a sign over zero devices.
 */
function buildSections(
  devices: Device[],
  filter: Category | 'all',
): AisleSection[] {
  // Section vocabulary — left-to-right order intentionally puts the
  // flagship displays (Boards, Bars, Kits) at the front of the aisle.
  const definitions: Array<{
    id: string
    category: Category
    label: string
    tall?: boolean
    /** Returns true if this device belongs to this section. */
    match: (d: Device) => boolean
  }> = [
    {
      id: 'boards',
      category: 'room',
      label: 'Boards',
      tall: true,
      match: (d) => d.category === 'room' && d.shape === 'board',
    },
    {
      id: 'room-bars',
      category: 'room',
      label: 'Room Bars',
      match: (d) => d.category === 'room' && d.shape === 'video-bar',
    },
    {
      id: 'room-kits',
      category: 'room',
      label: 'Modular & kits',
      match: (d) => d.category === 'room' && d.shape === 'codec-kit',
    },
    {
      id: 'desk-series',
      category: 'desk',
      label: CATEGORY_LABELS.desk,
      tall: true,
      match: (d) => d.category === 'desk',
    },
    {
      id: 'displays',
      category: 'room',
      label: 'Displays & signage',
      match: (d) => d.category === 'room' && d.shape === 'desk-display',
    },
    {
      id: 'cameras',
      category: 'camera',
      label: CATEGORY_LABELS.camera,
      match: (d) => d.category === 'camera',
    },
    {
      id: 'phones-desk',
      category: 'phone',
      label: 'Desk phones',
      match: (d) => d.category === 'phone' && d.shape === 'desk-phone',
    },
    {
      id: 'phones-conf',
      category: 'phone',
      label: 'Conference phones',
      match: (d) => d.category === 'phone' && d.shape === 'conference-phone',
    },
    {
      id: 'phones-wireless',
      category: 'phone',
      label: 'Wireless phones',
      match: (d) =>
        d.category === 'phone' &&
        (d.shape === 'wireless-phone' || d.shape === 'kem'),
    },
    {
      id: 'headsets',
      category: 'headset',
      label: CATEGORY_LABELS.headset,
      match: (d) => d.category === 'headset',
    },
    {
      id: 'mics',
      category: 'peripheral',
      label: 'Microphones',
      match: (d) => d.category === 'peripheral' && d.shape !== 'navigator',
    },
    {
      id: 'navigators',
      category: 'peripheral',
      label: 'Controllers',
      match: (d) => d.category === 'peripheral' && d.shape === 'navigator',
    },
  ]

  const sections: AisleSection[] = []
  for (const def of definitions) {
    // When a category chip is active, hide sections from other categories
    // so the aisle reads as a single bay instead of forcing the user to
    // scroll past empty signs.
    if (filter !== 'all' && def.category !== filter) continue
    const matched = devices.filter(def.match).slice().sort(bySizeDesc)
    if (matched.length === 0) continue
    if (def.tall) {
      sections.push({
        id: def.id,
        category: def.category,
        label: def.label,
        tall: true,
        top: [],
        bottom: [],
        full: matched,
      })
    } else {
      const { top, bottom } = splitShelves(matched)
      sections.push({
        id: def.id,
        category: def.category,
        label: def.label,
        top,
        bottom,
      })
    }
  }
  return sections
}
