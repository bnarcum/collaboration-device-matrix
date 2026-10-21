import { useEffect, useId, useRef, useState } from 'react'

export interface ResourceItem {
  label: string
  meta: string
  url: string
  icon?: string
}

interface Props {
  items: ResourceItem[]
}

/** Magnetic-style dropdown that collects the topbar document / tool links. */
export function ResourcesMenu({ items }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="resources-menu" ref={rootRef}>
      <button
        type="button"
        className="resources-menu-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        Resources
        <svg
          className="resources-menu-caret"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden
        >
          <path
            d="M3 4.5 6 7.5 9 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div className="resources-menu-panel" id={menuId}>
          {items.map((item) => (
            <a
              key={item.url}
              className="resources-menu-item"
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
            >
              <span className="resources-menu-icon" aria-hidden>
                {item.icon ?? '↗'}
              </span>
              <span className="resources-menu-text">
                <span className="resources-menu-label">{item.label}</span>
                <span className="resources-menu-meta">{item.meta}</span>
              </span>
              <span className="resources-menu-ext" aria-hidden>
                ↗
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
