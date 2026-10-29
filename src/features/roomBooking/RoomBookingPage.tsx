import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { isISODate, todayISO } from '../../lib/time'
import { RoomDaySchedule } from './RoomDaySchedule'
import { useRoomDay } from './useRoomDay'
import { useRooms } from './useRooms'
import './roomBooking.css'

export function RoomBookingPage() {
  const [params, setParams] = useSearchParams()
  const roomsState = useRooms()
  const rooms = roomsState.status === 'ready' ? roomsState.rooms : []

  // The URL is the single source of truth for the selection; invalid values fall back.
  const roomParam = params.get('room')
  const dateParam = params.get('date')
  const room = rooms.find((r) => r.id === roomParam) ?? rooms[0]
  const date = isISODate(dateParam) ? dateParam : todayISO()

  useEffect(() => {
    if (room && (roomParam !== room.id || dateParam !== date)) {
      setParams({ room: room.id, date }, { replace: true })
    }
  }, [room, roomParam, dateParam, date, setParams])

  const day = useRoomDay(room?.id, date)

  function select(next: { room?: string; date?: string }) {
    setParams({ room: next.room ?? room?.id ?? '', date: next.date || date })
  }

  return (
    <section className="room-booking">
      <h1>Room Booking</h1>

      {roomsState.status === 'error' && (
        <p className="banner error" role="alert">
          Could not load rooms: {roomsState.error}
        </p>
      )}

      <div className="toolbar card">
        <label>
          Room
          <select
            value={room?.id ?? ''}
            disabled={!room}
            onChange={(e) => select({ room: e.target.value })}
          >
            {roomsState.status === 'loading' && <option value="">Loading rooms…</option>}
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} (seats {r.capacity})
              </option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input type="date" value={date} required onChange={(e) => select({ date: e.target.value })} />
        </label>
      </div>

      <div className="room-layout">
        <div className="card">
          <h2>{room ? `${room.name} · ${date}` : 'Schedule'}</h2>
          {day.status === 'loading' && <p className="muted" role="status">Loading bookings…</p>}
          {day.status === 'error' && (
            <p className="banner error" role="alert">
              Could not load bookings: {day.error}{' '}
              <button type="button" onClick={day.reload}>
                Retry
              </button>
            </p>
          )}
          {day.status === 'ready' && <RoomDaySchedule bookings={day.bookings} />}
        </div>
      </div>
    </section>
  )
}
