import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Codec describing how a typed value is parsed from / serialized to a URL
 * search-param string. `serialize` returning `null` removes the param.
 */
export interface UrlCodec<T> {
  parse: (raw: string | null) => T
  serialize: (value: T) => string | null
}

/**
 * `useUrlState` mirrors a piece of React state into `window.location.search`
 * using `history.replaceState` so the back-button history doesn't grow
 * pathologically as the user clicks around. State→URL only writes when the
 * serialized representation actually changes; URL→state listens for
 * `popstate` so back/forward (and external pushState calls) stay in sync.
 *
 * The codec is the only authority on encoding — consumers can decide
 * whether to omit the param when the value is "default" by returning
 * `null` from `serialize`.
 */
export function useUrlState<T>(
  key: string,
  defaultValue: T,
  codec: UrlCodec<T>,
): [T, (next: T | ((prev: T) => T)) => void] {
  const codecRef = useRef(codec)
  codecRef.current = codec

  const readFromUrl = useCallback((): T => {
    if (typeof window === 'undefined') return defaultValue
    const params = new URLSearchParams(window.location.search)
    const raw = params.get(key)
    if (raw === null) return defaultValue
    try {
      return codecRef.current.parse(raw)
    } catch {
      return defaultValue
    }
  }, [key, defaultValue])

  const [value, setValue] = useState<T>(() => readFromUrl())

  // Listen for popstate / external history changes and re-read.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onPop = () => {
      setValue(readFromUrl())
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [readFromUrl])

  // Mirror state→URL on every change. Only call replaceState when the
  // serialized representation actually differs to avoid render churn.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const next = codecRef.current.serialize(value)
    const current = params.get(key)
    if (next === null) {
      if (current === null) return
      params.delete(key)
    } else {
      if (current === next) return
      params.set(key, next)
    }
    const search = params.toString()
    const url =
      window.location.pathname +
      (search ? '?' + search : '') +
      window.location.hash
    window.history.replaceState(window.history.state, '', url)
  }, [key, value])

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) =>
        typeof next === 'function' ? (next as (p: T) => T)(prev) : next,
      )
    },
    [],
  )

  return [value, set]
}

/* ───────────────────── reusable codecs ───────────────────── */

export const stringCodec = (defaultValue?: string): UrlCodec<string | null> => ({
  parse: (raw) => raw ?? null,
  serialize: (v) => (v === null || v === '' || v === defaultValue ? null : v),
})

/** Single-value enum (or null) param. */
export function enumCodec<V extends string>(
  allowed: readonly V[],
  defaultValue: V,
): UrlCodec<V>
export function enumCodec<V extends string>(
  allowed: readonly V[],
  defaultValue: null,
): UrlCodec<V | null>
export function enumCodec<V extends string>(
  allowed: readonly V[],
  defaultValue: V | null,
): UrlCodec<V | null> {
  return {
    parse: (raw) => (raw && (allowed as readonly string[]).includes(raw) ? (raw as V) : defaultValue),
    serialize: (v) => (v === null || v === defaultValue ? null : v),
  }
}

/** Comma-separated enum array. Unknown values are dropped silently. */
export function enumArrayCodec<V extends string>(
  allowed: readonly V[],
): UrlCodec<V[]> {
  const set = new Set<string>(allowed)
  return {
    parse: (raw) => {
      if (!raw) return []
      const out: V[] = []
      const seen = new Set<string>()
      for (const piece of raw.split(',')) {
        const t = piece.trim()
        if (!t) continue
        if (!set.has(t)) continue
        if (seen.has(t)) continue
        seen.add(t)
        out.push(t as V)
      }
      return out
    },
    serialize: (v) => (v.length === 0 ? null : v.join(',')),
  }
}

/** Free-form ID list (no allow-list). Caller is responsible for filtering. */
export const idArrayCodec: UrlCodec<string[]> = {
  parse: (raw) => {
    if (!raw) return []
    const out: string[] = []
    const seen = new Set<string>()
    for (const piece of raw.split(',')) {
      const t = piece.trim()
      if (!t) continue
      if (seen.has(t)) continue
      seen.add(t)
      out.push(t)
    }
    return out
  },
  serialize: (v) => (v.length === 0 ? null : v.join(',')),
}

/** Single string id (or null). */
export const idCodec: UrlCodec<string | null> = {
  parse: (raw) => (raw && raw.trim().length > 0 ? raw.trim() : null),
  serialize: (v) => (v === null || v === '' ? null : v),
}
