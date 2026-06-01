import { useEffect, useMemo, useRef, useState } from 'react'
import type { Device } from '../data/types'
import { CATEGORY_LABELS, VENDOR_LABELS } from '../data/types'

interface Props {
  devices: Device[]
  onSelect: (d: Device) => void
}

interface ScoredResult {
  device: Device
  score: number
}

const MAX_RESULTS = 8

/**
 * Lightweight in-process fuzzy matcher. We avoid pulling in a search lib by
 * scoring on (a) exact substring matches per field (1.0 each) and
 * (b) per-word matches (0.5 each). The fields we look at are intentionally
 * narrow — name/family/formFactor/tagline/highlights/useCases — to keep
 * results predictable as the catalog grows.
 */
function score(query: string, d: Device): number {
  const q = query.trim().toLowerCase()
  if (q.length === 0) return 0
  const fields: string[] = [
    d.name,
    d.family,
    d.formFactor,
    d.tagline,
    ...(d.highlights ?? []),
    ...(d.useCases ?? []),
  ].map((s) => (s ?? '').toLowerCase())
  let s = 0
  for (const f of fields) {
    if (f.includes(q)) s += 1
  }
  const words = q.split(/\s+/).filter((w) => w.length >= 2)
  if (words.length > 0) {
    for (const f of fields) {
      for (const w of words) {
        if (f.includes(w)) s += 0.5
      }
    }
  }
  // Bias name-prefix matches a hair higher so "boa" → Board first.
  if (d.name.toLowerCase().startsWith(q)) s += 0.75
  return s
}

export function SearchBar({ devices, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 720px)').matches
  })

  // Track viewport so we can collapse to an icon-only chip on narrow screens.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 720px)')
    const onChange = (e: MediaQueryListEvent) => setCollapsed(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Cmd/Ctrl+K → focus the search box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isK = e.key === 'k' || e.key === 'K'
      if (isK && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCollapsed(false)
        // Defer focus until after the input is rendered (in case it was an icon).
        requestAnimationFrame(() => {
          inputRef.current?.focus()
          inputRef.current?.select()
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Close the popover on outside click.
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const results = useMemo<ScoredResult[]>(() => {
    if (query.trim().length < 2) return []
    const ranked = devices
      .map((d) => ({ device: d, score: score(query, d) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
    return ranked.slice(0, MAX_RESULTS)
  }, [devices, query])

  // Clamp the highlighted index to the current result length on render.
  const safeActive = results.length === 0 ? 0 : Math.min(active, results.length - 1)

  const commit = (d: Device) => {
    onSelect(d)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }
  if (collapsed && !open) {
    return (
      <button
        className="search-icon-pill"
        aria-label="Search devices"
        title="Search devices  ⌘K"
        onClick={() => {
          setOpen(true)
          requestAnimationFrame(() => inputRef.current?.focus())
        }}
      >
        🔍
      </button>
    )
  }

  return (
    <div className="search-wrap" ref={wrapRef}>
      <div className="search-input-wrap">
        <span className="search-input-icon" aria-hidden>
          🔍
        </span>
        <input
          ref={inputRef}
          className="search-input"
          type="search"
          placeholder="Search devices…"
          aria-label="Search devices"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              if (results.length > 0) {
                setActive((i) => (Math.min(i, results.length - 1) + 1) % results.length)
                setOpen(true)
              }
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              if (results.length > 0) {
                setActive(
                  (i) =>
                    (Math.min(i, results.length - 1) - 1 + results.length) %
                    results.length,
                )
                setOpen(true)
              }
            } else if (e.key === 'Enter') {
              e.preventDefault()
              const r = results[safeActive]
              if (r) commit(r.device)
            } else if (e.key === 'Escape') {
              if (query.length > 0) setQuery('')
              else {
                setOpen(false)
                inputRef.current?.blur()
              }
            }
          }}
        />
        <span className="search-kbd kbd" aria-hidden>
          ⌘K
        </span>
      </div>
      {open && results.length > 0 && (
        <div className="search-popover" role="listbox">
          {results.map((r, i) => (
            <button
              key={r.device.id}
              className="search-result"
              data-highlighted={i === safeActive ? 'true' : 'false'}
              role="option"
              aria-selected={i === safeActive}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                // Prevent the input from blurring before the click handler runs.
                e.preventDefault()
              }}
              onClick={() => commit(r.device)}
            >
              <div className="search-result-text">
                <div className="search-result-name">{r.device.name}</div>
                <div className="search-result-meta">
                  {VENDOR_LABELS[r.device.vendorId]} · {r.device.family}
                </div>
              </div>
              <span className="search-result-cat">
                {CATEGORY_LABELS[r.device.category]}
              </span>
            </button>
          ))}
        </div>
      )}
      {open && query.trim().length >= 2 && results.length === 0 && (
        <div className="search-popover">
          <div className="search-empty">No matches</div>
        </div>
      )}
    </div>
  )
}
