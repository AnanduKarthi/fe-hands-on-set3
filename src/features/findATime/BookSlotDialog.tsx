import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useApi } from '../../api/ApiContext'
import { ApiError, errorMessage, type Booking, type ISODate, type Interval, type Room } from '../../api/types'
import { formatRange, formatTime } from '../../lib/time'
import { roomsThatFit, startOptions } from './slotBooking'
import { useRoomsWithBookings } from './useRoomsWithBookings'

interface Props {
  slot: Interval
  durationMinutes: number
  date: ISODate
  attendees: string[]
  onClose: () => void
  onBooked: (booking: Booking, room: Room) => void
  /** Someone else took the time meanwhile; the page shows the reason and recalculates. */
  onConflict: (message: string) => void
}

export function BookSlotDialog({ slot, durationMinutes, date, attendees, onClose, onBooked, onConflict }: Props) {
  const api = useApi()
  const roomsState = useRoomsWithBookings(date)
  const starts = startOptions(slot, durationMinutes)
  const [start, setStart] = useState(starts[0] ?? slot.start)
  const [title, setTitle] = useState('Team meeting')
  const [chosenRoomId, setChosenRoomId] = useState<string>()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>()
  const titleRef = useRef<HTMLInputElement>(null)

  const range: Interval = { start, end: start + durationMinutes }
  const candidates = roomsState.status === 'ready' ? roomsThatFit(roomsState.rooms, attendees.length, range) : []
  // The user's choice if it still fits, otherwise the smallest room that does.
  const room = candidates.find((r) => r.id === chosenRoomId) ?? candidates[0]

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    titleRef.current?.focus()
    return () => {
      if (previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [])

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape' && !submitting) onClose()
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!room || submitting) return
    if (!title.trim()) {
      setError('Enter a title')
      return
    }
    setSubmitting(true)
    setError(undefined)
    try {
      const booking = await api.createGroupBooking({ ...range, roomId: room.id, date, title: title.trim(), attendees })
      onBooked(booking, room)
    } catch (err) {
      if (err instanceof ApiError && err.kind === 'conflict') {
        onConflict(err.message)
        return
      }
      setError(errorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !submitting && onClose()}>
      <div
        className="dialog card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-slot-title"
        onKeyDown={handleKeyDown}
      >
        <form onSubmit={handleSubmit} noValidate>
          <h2 id="book-slot-title">Book {formatRange(range)}</h2>
          <p className="muted">
            Free {formatRange(slot)} · {attendees.length} attendee{attendees.length === 1 ? '' : 's'} · {date}
          </p>

          {error && (
            <p className="banner error" role="alert">
              {error}
            </p>
          )}

          <div className="field">
            <label htmlFor="slot-title">Title</label>
            <input id="slot-title" ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="slot-start">Start ({durationMinutes} min)</label>
            <select id="slot-start" value={start} onChange={(e) => setStart(Number(e.target.value))}>
              {starts.map((t) => (
                <option key={t} value={t}>
                  {formatTime(t)}–{formatTime(t + durationMinutes)}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="slot-room">Room</label>
            {roomsState.status === 'loading' && <p className="muted" role="status">Finding a room…</p>}
            {roomsState.status === 'error' && (
              <p className="field-error" role="alert">
                Could not load rooms: {roomsState.error}
              </p>
            )}
            {roomsState.status === 'ready' && candidates.length === 0 && (
              <p className="field-error" role="alert">
                No room for {attendees.length} people is free at {formatRange(range)}.
              </p>
            )}
            {candidates.length > 0 && (
              <select id="slot-room" value={room?.id} onChange={(e) => setChosenRoomId(e.target.value)}>
                {candidates.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} (seats {r.capacity})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="primary" disabled={!room || submitting}>
              {submitting ? 'Booking…' : 'Book'}
            </button>
            <button type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
