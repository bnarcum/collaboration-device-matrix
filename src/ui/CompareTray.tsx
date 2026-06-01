import type { Device } from '../data/types'

interface Props {
  items: Device[]
  onRemove: (d: Device) => void
  onOpen: (d: Device) => void
  onCompareAll: () => void
}

export function CompareTray({ items, onRemove, onOpen, onCompareAll }: Props) {
  if (items.length === 0) return null
  return (
    <div className="compare-tray" role="region" aria-label="Compare tray">
      <h3>Compare ({items.length}/3)</h3>
      {items.map((d) => (
        <div className="compare-row" key={d.id}>
          <button
            onClick={() => onOpen(d)}
            style={{
              padding: '0.2rem 0.55rem',
              fontSize: '0.78rem',
              maxWidth: 200,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={d.name}
          >
            {d.name}
          </button>
          <button onClick={() => onRemove(d)} aria-label={`Remove ${d.name}`}>
            ✕
          </button>
        </div>
      ))}
      {items.length >= 2 && (
        <button data-active="true" onClick={onCompareAll}>
          Compare ↗
        </button>
      )}
    </div>
  )
}
