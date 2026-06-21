import type { CSSProperties } from 'react'
import type { VendorId } from '../data/types'
import { vendorLabelTheme } from '../data/vendors'
import { resolveTronShowroom, TRON } from '../theme/tronShowroom'

/** Inline styles for 3D Html pills — same fill as active topbar vendor/mode pills. */
export function deviceLabelStyles(
  vendorId: VendorId,
  selected = false,
): CSSProperties {
  if (resolveTronShowroom()) {
    return {
      padding: '3px 10px',
      borderRadius: 2,
      background: 'rgba(0, 0, 0, 0.78)',
      border: `1px solid ${selected ? TRON.orange : TRON.cyan}`,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      color: selected ? TRON.orange : TRON.cyan,
      whiteSpace: 'nowrap',
      boxShadow: selected
        ? `0 0 16px rgba(255, 102, 0, 0.55), inset 0 0 6px rgba(255, 102, 0, 0.15)`
        : `0 0 12px rgba(0, 255, 240, 0.4), inset 0 0 6px rgba(0, 255, 240, 0.1)`,
      textShadow: selected
        ? '0 0 8px rgba(255, 102, 0, 0.9)'
        : '0 0 6px rgba(0, 255, 240, 0.75)',
    }
  }

  const theme = vendorLabelTheme(vendorId, selected)

  return {
    padding: '4px 10px',
    borderRadius: 999,
    background: theme.background,
    border: `1px solid ${theme.border}`,
    fontSize: 11,
    fontWeight: 600,
    color: theme.color,
    whiteSpace: 'nowrap',
    boxShadow:
      vendorId === 'neat' && !selected
        ? '0 2px 10px rgba(0, 0, 0, 0.45)'
        : selected
          ? '0 0 12px rgba(2, 200, 255, 0.4)'
          : '0 2px 8px rgba(0, 0, 0, 0.35)',
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
