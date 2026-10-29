import { useEffect, useState } from 'react'
import { useApi } from '../../api/ApiContext'
import { errorMessage, type Room } from '../../api/types'

export type RoomsState =
  | { status: 'loading' }
  | { status: 'ready'; rooms: Room[] }
  | { status: 'error'; error: string }

export function useRooms(): RoomsState {
  const api = useApi()
  const [state, setState] = useState<RoomsState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    api.getRooms(controller.signal).then(
      (rooms) => setState({ status: 'ready', rooms }),
      (error: unknown) => {
        if (!controller.signal.aborted) setState({ status: 'error', error: errorMessage(error) })
      },
    )
    return () => controller.abort()
  }, [api])

  return state
}
