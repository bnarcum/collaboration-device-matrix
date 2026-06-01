import { motion, AnimatePresence } from 'framer-motion'
import type { Device } from '../data/types'
import { CATEGORY_LABELS, ROOM_SIZE_LABELS, VENDOR_LABELS } from '../data/types'
import { vendorConfig } from '../data/vendors'
import { deviceImage } from '../data/deviceImages'
import { deviceProductUrl } from '../data/deviceProductUrls'

const COLOR_LABELS: Record<Device['colors'][number], string> = {
  carbon: 'Carbon Black',
  'first-light': 'First Light',
  silver: 'Silver',
  white: 'White',
}

interface Props {
  device: Device | null
  onClose: () => void
  inCompare: boolean
  canAddCompare: boolean
  onToggleCompare: (d: Device) => void
}

export function DeviceDrawer({
  device,
  onClose,
  inCompare,
  canAddCompare,
  onToggleCompare,
}: Props) {
  const productUrl = device ? deviceProductUrl(device.id) : undefined
  const vendor = device ? vendorConfig(device.vendorId) : null

  return (
    <AnimatePresence>
      {device && vendor && (
        <>
          <motion.div
            className="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="drawer"
            key={device.id}
            initial={{ x: 480, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 480, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            role="dialog"
            aria-label={`${device.name} details`}
          >
            <header className="drawer-header">
              <div>
                <div className="tag">{CATEGORY_LABELS[device.category]}</div>
                <div
                  className="vendor-tag"
                  data-vendor={device.vendorId}
                >
                  {VENDOR_LABELS[device.vendorId]}
                </div>
                <h2>{device.name}</h2>
              </div>
              <button onClick={onClose} aria-label="Close details">
                ✕
              </button>
            </header>
            <p className="tagline">{device.tagline}</p>

            {deviceImage(device.id) && (
              <div className="drawer-photo">
                <img src={deviceImage(device.id)} alt={device.name} />
              </div>
            )}

            <h4>Form factor</h4>
            <p className="spec">{device.formFactor}</p>

            {device.recommendedPeople && (
              <>
                <h4>Recommended for</h4>
                <p className="spec">{device.recommendedPeople} people</p>
              </>
            )}

            <h4>Room sizes</h4>
            <p className="spec">
              {device.roomSizes.map((r) => ROOM_SIZE_LABELS[r]).join(' · ')}
            </p>

            {device.highlights?.length > 0 && (
              <>
                <h4>Key features</h4>
                <ul>
                  {device.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </>
            )}

            {device.display && (
              <>
                <h4>Display</h4>
                <p className="spec">{device.display}</p>
              </>
            )}
            {device.camera && (
              <>
                <h4>Camera</h4>
                <p className="spec">{device.camera}</p>
              </>
            )}
            {device.audio && (
              <>
                <h4>Audio</h4>
                <p className="spec">{device.audio}</p>
              </>
            )}
            {device.connectivity && device.connectivity.length > 0 && (
              <>
                <h4>Connectivity</h4>
                <p className="spec">{device.connectivity.join(' · ')}</p>
              </>
            )}
            {device.software && device.software.length > 0 && (
              <>
                <h4>Platforms &amp; software</h4>
                <p className="spec">{device.software.join(' · ')}</p>
              </>
            )}

            <h4>Colors</h4>
            <p className="spec">
              {device.colors.map((c) => COLOR_LABELS[c]).join(' · ')}
            </p>

            <div
              style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}
            >
              <button
                onClick={() => onToggleCompare(device)}
                data-active={inCompare ? 'true' : 'false'}
                disabled={!inCompare && !canAddCompare}
                title={
                  !inCompare && !canAddCompare
                    ? 'Compare tray full — remove one to add'
                    : ''
                }
              >
                {inCompare ? '✓ In compare' : '＋ Add to compare'}
              </button>
              <button onClick={onClose}>Close</button>
            </div>

            <div className="drawer-resource-links">
              {vendor.resourceLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="drawer-external-link"
                  aria-label={`Open ${link.label} (opens in a new tab)`}
                >
                  <span aria-hidden>{link.icon ?? '↗'}</span>
                  <span>
                    {link.label}
                    {link.meta && (
                      <span className="drawer-external-link-note">
                        {link.meta}
                      </span>
                    )}
                  </span>
                </a>
              ))}
            </div>

            {productUrl && (
              <a
                href={productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="drawer-external-link drawer-product-page-link"
                aria-label={`View official product page for ${device.name} (opens in a new tab)`}
              >
                <span aria-hidden>↗</span>
                <span>View official product page ↗</span>
              </a>
            )}

            <p
              style={{
                marginTop: 18,
                fontSize: 11,
                color: 'var(--fg-3)',
                lineHeight: 1.5,
              }}
            >
              {vendor.disclaimer}{' '}
              <a
                href={vendor.website}
                target="_blank"
                rel="noreferrer noopener"
                style={{ color: 'var(--brand-primary)' }}
              >
                {vendor.name} website
              </a>
              .
            </p>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
