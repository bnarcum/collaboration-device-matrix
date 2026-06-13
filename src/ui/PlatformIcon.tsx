import type { MeetingPlatformId } from '../data/types'

interface Props {
  platform: MeetingPlatformId
  className?: string
}

/** Compact brand marks for the platform filter pills. */
export function PlatformIcon({ platform, className = 'platform-switch-icon' }: Props) {
  switch (platform) {
    case 'webex':
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          aria-hidden
          focusable="false"
        >
          <circle cx="12" cy="12" r="10" fill="#009DFF" />
          <path
            fill="#fff"
            d="M7.5 13.2c2.1 1.5 4.9 1.5 7 0 .6-.4.6-1.2 0-1.6-2.1-1.5-4.9-1.5-7 0-.6.4-.6 1.2 0 1.6Z"
          />
          <path
            fill="#fff"
            d="M7.5 10.4c2.1-1.5 4.9-1.5 7 0 .6.4.6 1.2 0 1.6-2.1 1.5-4.9 1.5-7 0-.6-.4-.6-1.2 0-1.6Z"
          />
        </svg>
      )
    case 'teams':
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          aria-hidden
          focusable="false"
        >
          <rect width="24" height="24" rx="4.5" fill="#464EB8" />
          <path
            fill="#fff"
            d="M11.1 7.2h1.8v9.6h-1.8V7.2Zm2.9 4.8 3.1-2.4h-2.1l-2.3 1.8 2.5 3h2.1l-2.3-2.6 2.3 2.6h2.1l-3.2-3.4Z"
          />
          <circle cx="8.2" cy="10" r="2.4" fill="#7B83EB" />
          <path
            fill="#fff"
            d="M5.8 13.1c0-1.3 1.1-2.4 2.4-2.4h.7v4.8H8.2c-1.3 0-2.4-1.1-2.4-2.4Z"
          />
        </svg>
      )
    case 'zoom':
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          aria-hidden
          focusable="false"
        >
          <rect width="24" height="24" rx="6" fill="#2D8CFF" />
          <path
            fill="#fff"
            d="M6.8 8.2h7.2c1 0 1.8.8 1.8 1.8v3.2c0 1-.8 1.8-1.8 1.8h-2.4l-3 2.1v-2.1H6.8c-1 0-1.8-.8-1.8-1.8v-3.2c0-1 .8-1.8 1.8-1.8Z"
          />
        </svg>
      )
    case 'google':
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          aria-hidden
          focusable="false"
        >
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
          />
        </svg>
      )
  }
}
