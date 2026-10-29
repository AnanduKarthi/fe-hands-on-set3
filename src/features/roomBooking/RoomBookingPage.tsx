import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApi } from '../../api/ApiContext'
import { ApiError, errorMessage, type Booking, type Interval } from '../../api/types'
import { byStart } from '../../lib/intervals'
import { formatRange, isISODate, todayISO } from '../../lib/time'
import type { BookingDraft } from '../../lib/validateBooking'
import { BookingForm } from './BookingForm'
import { RoomDaySchedule } from './RoomDaySchedule'
import { dayKey, useRoomDay } from './useRoomDay'
import { useRooms } from './useRooms'
import './roomBooking.css'

export function RoomBookingPage() {
  const api = useApi()
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
  const [notice, setNotice] = useState<string>()
  const [cancelError, setCancelError] = useState<string>()

  function select(next: { room?: string; date?: string }) {
    setNotice(undefined)
    setCancelError(undefined)
    setParams({ room: next.room ?? room?.id ?? '', date: next.date || date })
  }

  async function createBooking(draft: BookingDraft) {
    if (!room) return
    const key = dayKey(room.id, date)
    setNotice(undefined)
    try {
      const created = await api.createBooking({ ...draft, roomId: room.id, date })
      day.updateBookings(key, (bookings) => [...bookings, created].sort(byStart))
      setNotice(`Booked “${created.title}” for ${formatRange(created)}.`)
    } catch (error) {
      // Someone else got there first: refresh so the schedule (and the overlap check) see it.
      if (error instanceof ApiError && error.kind === 'conflict') day.reload()
      throw error
    }
  }

  /** Optimistic: remove right away, put it back if the API call fails. */
  async function cancelBooking(booking: Booking) {
    const key = day.key
    setNotice(undefined)
    setCancelError(undefined)
    day.updateBookings(key, (bookings) => bookings.filter((b) => b.id !== booking.id))
    try {
      await api.cancelBooking(booking.id)
      setNotice(`Cancelled “${booking.title}” (${formatRange(booking)}).`)
    } catch (error) {
      if (error instanceof ApiError && error.kind === 'not_found') return // already gone
      day.updateBookings(key, (bookings) =>
        bookings.some((b) => b.id === booking.id) ? bookings : [...bookings, booking].sort(byStart),
      )
      setCancelError(`Could not cancel “${booking.title}”: ${errorMessage(error)}`)
    }
  }

  function simulateConflict(range: Interval) {
    if (!room) return
    api.simulateExternalBooking({
      ...range,
      roomId: room.id,
      date,
      title: 'Booked by another user',
      attendees: [],
    })
    setNotice(`Another user just booked ${formatRange(range)}. Your schedule doesn't show it yet, so try booking it.`)
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
          {cancelError && (
            <p className="banner error" role="alert">
              {cancelError}
            </p>
          )}
          {day.status === 'ready' && <RoomDaySchedule bookings={day.bookings} onCancel={cancelBooking} />}
        </div>

        <div className="card">
          {notice && (
            <p className="banner success" role="status">
              {notice}
            </p>
          )}
          <BookingForm
            existing={day.bookings}
            disabled={!room || day.status !== 'ready'}
            onSubmit={createBooking}
            onSimulateConflict={simulateConflict}
          />
        </div>
      </div>
    </section>
  )
}
