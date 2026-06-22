import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  initTronShowroomFromSession,
  resolveTronShowroom,
  setTronShowroomActive,
} from './tronShowroom'
import { playTronGridSting } from '../ui/tronSting'

interface TronContextValue {
  enabled: boolean
  toggle: () => void
}

const TronShowroomContext = createContext<TronContextValue | null>(null)

export function TronShowroomProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(() => initTronShowroomFromSession())

  useEffect(() => {
    setTronShowroomActive(enabled)
  }, [enabled])

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev
      if (next) playTronGridSting()
      setTronShowroomActive(next)
      return next
    })
  }, [])

  const value = useMemo(() => ({ enabled, toggle }), [enabled, toggle])

  return (
    <TronShowroomContext.Provider value={value}>
      {children}
    </TronShowroomContext.Provider>
  )
}

export function useTronShowroom(): TronContextValue {
  const ctx = useContext(TronShowroomContext)
  if (!ctx) {
    return {
      enabled: resolveTronShowroom(),
      toggle: () => {},
    }
  }
  return ctx
}
