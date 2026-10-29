import { useCallback, useEffect, useState } from 'react'
import { useApi } from '../../api/ApiContext'
import { errorMessage, type Booking, type ISODate } from '../../api/types'

type Status = 'loading' | 'ready' | 'error'

interface DayState {
  /** Which room/day these bookings belong to, so stale data is never shown for a new selection. */
  key: string
  status: Status
  bookings: Booking[]
  error?: string
}

export type BookingsUpdater = (bookings: Booking[]) => Booking[]

export function dayKey(roomId: string, date: ISODate): string {
  return `${roomId}|${date}`
}

/**
 * Loads one room's bookings for one day. Changing room or date aborts the
 * in-flight request, so a slow, older response can never overwrite a newer one.
 */
export function useRoomDay(roomId: string | undefined, date: ISODate) {
  const api = useApi()
  const key = roomId ? dayKey(roomId, date) : ''
  const [state, setState] = useState<DayState>({ key: '', status: 'loading', bookings: [] })
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!roomId) return
    const controller = new AbortController()
    api.getBookings(roomId, date, controller.signal).then(
      (bookings) => setState({ key, status: 'ready', bookings }),
      (error: unknown) => {
        if (controller.signal.aborted) return
        setState({ key, status: 'error', bookings: [], error: errorMessage(error) })
      },
    )
    return () => controller.abort()
  }, [api, roomId, date, key, reloadToken])

  const reload = useCallback(() => setReloadToken((t) => t + 1), [])

  /** Applies `updater` only if the user is still looking at the day identified by `forKey`. */
  const updateBookings = useCallback((forKey: string, updater: BookingsUpdater) => {
    setState((s) => (s.key === forKey ? { ...s, bookings: updater(s.bookings) } : s))
  }, [])

  const current: DayState = state.key === key ? state : { key, status: 'loading', bookings: [] }
  return { ...current, reload, updateBookings }
}
