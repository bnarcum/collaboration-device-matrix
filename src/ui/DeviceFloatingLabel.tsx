import type { CSSProperties } from 'react'
import type { VendorId } from '../data/types'
import { vendorConfig } from '../data/vendors'
import { MAGNETIC } from '../theme/magnetic'
import { resolveTronShowroom, TRON } from '../theme/tronShowroom'

/** Idle showroom pills use the model token so dense arcs stay readable. */
export function shortShowroomName(name: string): string {
  const models = name.match(/\d{3,5}[A-Za-z]?/g)
  if (!models || models.length === 0) return name
  const model = models[models.length - 1]
  if (/kem|key exp/i.test(name)) return `${model} KEM`
  if (/dect/i.test(name)) return `${model} DECT`
  if (/conference/i.test(name)) return `${model} Conf`
  return model
}

/** Inline styles for 3D Html tags — Magnetic slate tags with a vendor stripe. */
export function deviceLabelStyles(
  vendorId: VendorId,
  selected = false,
): CSSProperties {
  if (resolveTronShowroom()) {
    return {
      padding: selected ? '3px 8px' : '1px 5px',
      borderRadius: 2,
      background: 'rgba(0, 0, 0, 0.78)',
      border: `1px solid ${selected ? TRON.orange : TRON.cyan}`,
      fontSize: selected ? 10 : 8,
      fontWeight: 700,
      letterSpacing: selected ? '0.06em' : '0.02em',
      textTransform: 'uppercase',
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      color: selected ? TRON.orange : TRON.cyan,
      whiteSpace: 'nowrap',
      lineHeight: 1.2,
      boxShadow: selected
        ? `0 0 16px rgba(255, 102, 0, 0.55), inset 0 0 6px rgba(255, 102, 0, 0.15)`
        : `0 0 8px rgba(0, 255, 240, 0.28), inset 0 0 6px rgba(0, 255, 240, 0.08)`,
      textShadow: selected
        ? '0 0 8px rgba(255, 102, 0, 0.9)'
        : '0 0 4px rgba(0, 255, 240, 0.65)',
    }
  }

  const stripe = vendorConfig(vendorId).primary

  return {
    padding: selected ? '3px 8px 3px 7px' : '1px 5px 1px 4px',
    borderRadius: 4,
    background: selected ? MAGNETIC.accent : MAGNETIC.surfaceGlass,
    border: `1px solid ${selected ? MAGNETIC.accent : MAGNETIC.borderStrong}`,
    borderLeft: `3px solid ${selected ? '#ffffff' : stripe}`,
    fontSize: selected ? 11 : 8,
    fontWeight: 600,
    fontFamily: MAGNETIC.font,
    color: MAGNETIC.text,
    whiteSpace: 'nowrap',
    lineHeight: 1.2,
    boxShadow: selected
      ? '0 4px 12px rgba(0, 0, 0, 0.45)'
      : '0 1px 4px rgba(0, 0, 0, 0.35)',
  }
}

interface Props {
  name: string
  vendorId: VendorId
  selected?: boolean
  style?: CSSProperties
}

export function DeviceFloatingLabel({
  name,
  vendorId,
  selected = false,
  style,
}: Props) {
  return (
    <div style={{ ...deviceLabelStyles(vendorId, selected), ...style }}>
      {name}
    </div>
  )
}
