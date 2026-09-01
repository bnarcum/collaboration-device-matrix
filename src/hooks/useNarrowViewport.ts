import { useEffect, useState } from 'react'

/** Matches SearchBar collapse and mobile chrome. Desktop is unchanged above this. */
export const NARROW_VIEWPORT_QUERY = '(max-width: 720px)'

/**
 * True on phone-width viewports. Desktop layout, camera, and controls
 * stay on their existing paths when this is false.
 */
export function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(NARROW_VIEWPORT_QUERY).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(NARROW_VIEWPORT_QUERY)
    const onChange = (e: MediaQueryListEvent) => setNarrow(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return narrow
}
