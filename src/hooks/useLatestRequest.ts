import { useCallback, useEffect, useRef } from 'react'

export interface RequestTicket {
  signal: AbortSignal
  /** False once a newer request has started (or the component unmounted). */
  isLatest: () => boolean
}

/**
 * Makes sure only the newest request's result is used. Starting a request
 * aborts the previous one. `isLatest()` is a second guard for APIs that ignore
 * the abort signal and resolve anyway.
 */
export function useLatestRequest(): () => RequestTicket {
  const counter = useRef(0)
  const controller = useRef<AbortController | null>(null)

  useEffect(
    () => () => {
      counter.current++
      controller.current?.abort()
    },
    [],
  )

  return useCallback(() => {
    controller.current?.abort()
    const current = new AbortController()
    controller.current = current
    const id = ++counter.current
    return {
      signal: current.signal,
      isLatest: () => id === counter.current && !current.signal.aborted,
    }
  }, [])
}
