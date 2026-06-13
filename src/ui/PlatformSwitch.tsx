import {
  MEETING_PLATFORM_ORDER,
  MEETING_PLATFORM_SHORT_LABELS,
  type MeetingPlatformId,
} from '../data/platforms'
import { PlatformIcon } from './PlatformIcon'

interface Props {
  selected: MeetingPlatformId[]
  includeInterop: boolean
  onToggle: (platform: MeetingPlatformId) => void
  onToggleAll: () => void
  onIncludeInteropChange: (value: boolean) => void
}

export function PlatformSwitch({
  selected,
  includeInterop,
  onToggle,
  onToggleAll,
  onIncludeInteropChange,
}: Props) {
  const allSelected =
    selected.length === MEETING_PLATFORM_ORDER.length &&
    MEETING_PLATFORM_ORDER.every((p) => selected.includes(p))

  return (
    <div className="platform-bar">
      <span className="platform-bar-label">Meeting platforms</span>
      <nav className="platform-switch" role="group" aria-label="Meeting platforms">
        {MEETING_PLATFORM_ORDER.map((p) => {
          const on = selected.includes(p)
          const label = MEETING_PLATFORM_SHORT_LABELS[p]
          return (
            <button
              key={p}
              type="button"
              className="platform-switch-btn"
              data-platform={p}
              data-active={on ? 'true' : 'false'}
              aria-pressed={on}
              aria-label={label}
              title={label}
              onClick={() => onToggle(p)}
            >
              <PlatformIcon platform={p} />
              <span>{label}</span>
            </button>
          )
        })}
        <button
          type="button"
          className="platform-switch-all"
          data-active={allSelected ? 'true' : 'false'}
          aria-pressed={allSelected}
          title={allSelected ? 'Clear platform filter' : 'Filter by all platforms'}
          onClick={onToggleAll}
        >
          All
        </button>
      </nav>
      <label className="platform-interop-toggle">
        <input
          type="checkbox"
          checked={includeInterop}
          onChange={(e) => onIncludeInteropChange(e.target.checked)}
        />
        <span>Include interop &amp; apps</span>
      </label>
    </div>
  )
}
