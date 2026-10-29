import { useEffect, useState } from 'react'
import { useApi } from '../../api/ApiContext'
import { errorMessage, type Booking, type ISODate, type Room } from '../../api/types'

export interface RoomDay {
  room: Room
  bookings: Booking[]
}

export type RoomDaysState =
  | { status: 'loading' }
  | { status: 'ready'; rooms: RoomDay[] }
  | { status: 'error'; error: string }

/** Every room with its bookings on `date`, so we can pick one that is free and big enough. */
export function useRoomsWithBookings(date: ISODate): RoomDaysState {
  const api = useApi()
  const [state, setState] = useState<RoomDaysState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    api
      .getRooms(signal)
      .then((rooms) =>
        Promise.all(rooms.map(async (room) => ({ room, bookings: await api.getBookings(room.id, date, signal) }))),
      )
      .then(
        (rooms) => setState({ status: 'ready', rooms }),
        (error: unknown) => {
          if (!signal.aborted) setState({ status: 'error', error: errorMessage(error) })
        },
      )
    return () => controller.abort()
  }, [api, date])

  return state
}
