import { PLATFORM_ICON_SRC } from '../data/platformIcons'
import type { MeetingPlatformId } from '../data/types'

interface Props {
  platform: MeetingPlatformId
  active?: boolean
}

/** Official app icons at pill size — sources in public/platform-icons/. */
export function PlatformIcon({ platform, active }: Props) {
  return (
    <span
      className={['platform-badge', active ? 'platform-badge--active' : ''].filter(Boolean).join(' ')}
      data-platform={platform}
      aria-hidden
    >
      <img
        src={PLATFORM_ICON_SRC[platform]}
        alt=""
        className="platform-badge-img"
        width={26}
        height={26}
        decoding="async"
        draggable={false}
      />
    </span>
  )
}
