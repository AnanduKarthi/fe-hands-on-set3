import { useCallback, useEffect, useState } from 'react'
import { useApi } from '../../api/ApiContext'
import { errorMessage, isAbortError, type Availability, type ISODate } from '../../api/types'
import { useLatestRequest } from '../../hooks/useLatestRequest'
import { usePolling } from '../../hooks/usePolling'

export const REFRESH_INTERVAL_MS = 10_000

interface State {
  /** The selection (date + attendees) this data belongs to. */
  key: string
  status: 'idle' | 'loading' | 'ready' | 'error'
  data: Availability
  updatedAt?: Date
  error?: string
}

const EMPTY: Availability = {}

/**
 * Loads the attendees' bookings for a date, then refreshes every 10 s while the tab is visible.
 * Only the latest request's response is applied, and data is shown only for the selection it was
 * fetched for, so a slow, older response never replaces or poses as a newer one.
 */
export function useAvailability(emails: string[], date: ISODate) {
  const api = useApi()
  const startRequest = useLatestRequest()
  const key = `${date}|${emails.join(',')}`
  const [state, setState] = useState<State>({ key: '', status: 'idle', data: EMPTY })

  const refresh = useCallback(async () => {
    const ticket = startRequest() // also cancels any request for a previous selection
    if (emails.length === 0) return
    try {
      const data = await api.getBookingsForPeople(emails, date, ticket.signal)
      if (!ticket.isLatest()) return
      setState({ key, status: 'ready', data, updatedAt: new Date() })
    } catch (error) {
      if (!ticket.isLatest() || isAbortError(error)) return
      // A failed background refresh keeps the last good data for this selection.
      setState((s) =>
        s.key === key && s.status === 'ready'
          ? { ...s, error: errorMessage(error) }
          : { key, status: 'error', data: EMPTY, error: errorMessage(error) },
      )
    }
  }, [api, startRequest, emails, date, key])

  useEffect(() => {
    // Syncing with the API: state is only set after the response arrives, never synchronously.
    // oxlint-disable-next-line react/set-state-in-effect
    void refresh()
  }, [refresh])

  usePolling(refresh, REFRESH_INTERVAL_MS, emails.length > 0)

  if (emails.length === 0) return { status: 'idle' as const, data: EMPTY, refresh }
  if (state.key !== key) return { status: 'loading' as const, data: EMPTY, refresh }
  return { ...state, refresh }
}
