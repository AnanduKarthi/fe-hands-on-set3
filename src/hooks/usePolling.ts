import { useEffect, useRef } from 'react'

/**
 * Calls `callback` every `intervalMs` while the tab is visible. Pauses while it is
 * hidden, and refreshes right away when it becomes visible again.
 */
export function usePolling(callback: () => void, intervalMs: number, enabled = true): void {
  const latestCallback = useRef(callback)
  useEffect(() => {
    latestCallback.current = callback
  })

  useEffect(() => {
    if (!enabled) return
    let timer: ReturnType<typeof setInterval> | undefined

    const stop = () => {
      clearInterval(timer)
      timer = undefined
    }
    const start = () => {
      stop()
      timer = setInterval(() => latestCallback.current(), intervalMs)
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        latestCallback.current()
        start()
      } else {
        stop()
      }
    }

    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [intervalMs, enabled])
}
