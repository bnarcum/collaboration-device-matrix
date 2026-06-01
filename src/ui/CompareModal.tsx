import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Device } from '../data/types'
import { CATEGORY_LABELS, ROOM_SIZE_LABELS, VENDOR_LABELS } from '../data/types'

interface Props {
  items: Device[]
  open: boolean
  onClose: () => void
}

const ROWS: { key: string; label: string; get: (d: Device) => string }[] = [
  { key: 'vendor', label: 'Manufacturer', get: (d) => VENDOR_LABELS[d.vendorId] },
  { key: 'cat', label: 'Category', get: (d) => CATEGORY_LABELS[d.category] },
  { key: 'form', label: 'Form factor', get: (d) => d.formFactor },
  { key: 'tag', label: 'Tagline', get: (d) => d.tagline },
  { key: 'ppl', label: 'For', get: (d) => d.recommendedPeople ?? '—' },
  {
    key: 'rooms',
    label: 'Rooms',
    get: (d) => d.roomSizes.map((r) => ROOM_SIZE_LABELS[r]).join(', '),
  },
  { key: 'display', label: 'Display', get: (d) => d.display ?? '—' },
  { key: 'camera', label: 'Camera', get: (d) => d.camera ?? '—' },
  { key: 'audio', label: 'Audio', get: (d) => d.audio ?? '—' },
  {
    key: 'conn',
    label: 'Connectivity',
    get: (d) => d.connectivity?.join(', ') ?? '—',
  },
  {
    key: 'sw',
    label: 'Software',
    get: (d) => d.software?.join(', ') ?? '—',
  },
  {
    key: 'colors',
    label: 'Colors',
    get: (d) =>
      d.colors
        .map((c) =>
          c === 'carbon'
            ? 'Carbon Black'
            : c === 'first-light'
              ? 'First Light'
              : c === 'silver'
                ? 'Silver'
                : 'White',
        )
        .join(', '),
  },
]

/** Case- and whitespace-insensitive equivalence used for diff dimming. */
function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

export function CompareModal({ items, open, onClose }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // Fallback for older browsers / restrictive permissions: select the URL
      // in a hidden textarea and execCommand-copy it.
      const ta = document.createElement('textarea')
      ta.value = window.location.href
      ta.setAttribute('readonly', '')
      ta.style.position = 'absolute'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1600)
      } catch {
        // Give up silently; clipboard isn't available.
      }
      document.body.removeChild(ta)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ background: 'rgba(0,0,0,0.6)', zIndex: 30 }}
          />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 200 }}
            role="dialog"
            aria-label="Compare devices"
            style={{
              position: 'absolute',
              inset: '5% 5%',
              zIndex: 31,
              background: 'rgba(8,12,22,0.96)',
              border: '1px solid var(--line-strong)',
              borderRadius: 18,
              padding: '1.25rem',
              overflow: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
                gap: 8,
              }}
            >
              <h2 style={{ margin: 0 }}>Compare</h2>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={handleCopyLink}
                  className="compare-copy-link"
                  data-copied={copied ? 'true' : 'false'}
                  aria-live="polite"
                  title="Copy a shareable link with the current compare set and view"
                >
                  {copied ? '✓ Copied!' : '⎘ Copy link'}
                </button>
                <button onClick={onClose} aria-label="Close compare">
                  ✕
                </button>
              </div>
            </div>
            <div style={{ overflow: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.88rem',
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: '0.5rem 0.6rem',
                        color: 'var(--fg-3)',
                        borderBottom: '1px solid var(--line)',
                      }}
                    />
                    {items.map((d) => (
                      <th
                        key={d.id}
                        style={{
                          textAlign: 'left',
                          padding: '0.6rem',
                          color: 'var(--brand-primary)',
                          borderBottom: '1px solid var(--line)',
                          minWidth: 220,
                        }}
                      >
                        {d.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => {
                    const values = items.map((d) => row.get(d))
                    const normValues = values.map(norm)
                    const allSame =
                      normValues.length > 1 &&
                      normValues.every((v) => v === normValues[0])
                    const baseline = normValues[0]
                    return (
                      <tr
                        key={row.key}
                        style={{ opacity: allSame ? 0.45 : 1 }}
                      >
                        <th
                          scope="row"
                          style={{
                            textAlign: 'left',
                            padding: '0.5rem 0.6rem',
                            color: 'var(--fg-3)',
                            verticalAlign: 'top',
                            borderBottom: '1px solid var(--line)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {row.label}
                        </th>
                        {items.map((d, i) => {
                          const differs = !allSame && normValues[i] !== baseline
                          return (
                            <td
                              key={d.id}
                              style={{
                                padding: '0.5rem 0.6rem',
                                color: 'var(--fg-2)',
                                verticalAlign: 'top',
                                borderBottom: '1px solid var(--line)',
                                borderLeft: differs
                                  ? '2px solid var(--brand-primary)'
                                  : '2px solid transparent',
                                background: differs
                                  ? 'rgba(4, 159, 217, 0.08)'
                                  : 'transparent',
                              }}
                            >
                              {values[i]}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
