import type { CSSProperties } from 'react'
import type { VendorId } from '../data/types'
import { vendorLabelTheme } from '../data/vendors'

/** Inline styles for 3D Html pills — same fill as active topbar vendor/mode pills. */
export function deviceLabelStyles(
  vendorId: VendorId,
  selected = false,
): CSSProperties {
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
          ? '0 0 12px rgba(4, 159, 217, 0.4)'
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
