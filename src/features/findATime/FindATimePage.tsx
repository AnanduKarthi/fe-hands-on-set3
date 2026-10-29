import { useDeferredValue, useMemo, useState } from 'react'
import { PERSON_A, PERSON_B } from '../../api/seed'
import type { Booking, Interval, Person, Room } from '../../api/types'
import { atLeast, clipToWindow, gapsBetween, mergeIntervals } from '../../lib/freeSlots'
import { WORKING_DAY, formatRange, isISODate, todayISO } from '../../lib/time'
import { AttendeePicker } from './AttendeePicker'
import { AttendeeRow } from './AttendeeRow'
import { BookSlotDialog } from './BookSlotDialog'
import { FreeSlotsRow } from './FreeSlotsRow'
import { TimelineAxis } from './TimelineAxis'
import { useAvailability } from './useAvailability'
import { usePeople } from './usePeople'
import './findATime.css'

export const MIN_DURATION = 5
export const MAX_DURATION = WORKING_DAY.end - WORKING_DAY.start
const NO_BOOKINGS: Booking[] = []

type Notice = { kind: 'success' | 'error'; text: string }

export function FindATimePage() {
  const peopleState = usePeople()
  const people = useMemo(() => (peopleState.status === 'ready' ? peopleState.people : []), [peopleState])
  const [date, setDate] = useState(todayISO())
  const [durationInput, setDurationInput] = useState('30')
  const [duration, setDuration] = useState(30)
  const [selected, setSelected] = useState<string[]>([PERSON_A.email, PERSON_B.email])
  const [bookingSlot, setBookingSlot] = useState<Interval>()
  const [notice, setNotice] = useState<Notice>()

  const availability = useAvailability(selected, date)
  const { data } = availability

  // Merging depends only on the data. Changing D just re-filters the gaps, which is O(gaps).
  const gaps = useMemo(
    () => gapsBetween(mergeIntervals(clipToWindow(Object.values(data).flat(), WORKING_DAY)), WORKING_DAY),
    [data],
  )
  const deferredDuration = useDeferredValue(duration)
  const freeSlots = useMemo(() => atLeast(gaps, deferredDuration), [gaps, deferredDuration])

  const selectedPeople = useMemo(() => {
    const byEmail = new Map(people.map((p) => [p.email, p]))
    return selected.map((email): Person => byEmail.get(email) ?? { email, name: email })
  }, [people, selected])

  const durationError =
    Number.isInteger(Number(durationInput)) &&
    Number(durationInput) >= MIN_DURATION &&
    Number(durationInput) <= MAX_DURATION
      ? undefined
      : `Enter whole minutes between ${MIN_DURATION} and ${MAX_DURATION}`

  function changeDuration(value: string) {
    setDurationInput(value)
    const minutes = Number(value)
    if (value !== '' && Number.isInteger(minutes) && minutes >= MIN_DURATION && minutes <= MAX_DURATION) {
      setDuration(minutes)
    }
  }

  function changeSelection(emails: string[]) {
    setNotice(undefined)
    setSelected(emails)
  }

  function handleBooked(booking: Booking, room: Room) {
    setBookingSlot(undefined)
    setNotice({ kind: 'success', text: `Booked “${booking.title}” ${formatRange(booking)} in ${room.name}.` })
    void availability.refresh()
  }

  function handleConflict(message: string) {
    setBookingSlot(undefined)
    setNotice({ kind: 'error', text: `${message} Free slots have been recalculated.` })
    void availability.refresh()
  }

  const summary =
    availability.status === 'ready'
      ? `${freeSlots.length} common free slot${freeSlots.length === 1 ? '' : 's'} of at least ${deferredDuration} minutes.`
      : ''

  return (
    <section className="find-a-time">
      <h1>Find a Time</h1>

      <div className="fat-layout">
        <aside className="card fat-controls">
          <div className="field">
            <label htmlFor="fat-date">Date</label>
            <input
              id="fat-date"
              type="date"
              value={date}
              required
              onChange={(e) => isISODate(e.target.value) && setDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="fat-duration">Meeting length (minutes)</label>
            <input
              id="fat-duration"
              type="number"
              inputMode="numeric"
              min={MIN_DURATION}
              max={MAX_DURATION}
              step={15}
              value={durationInput}
              aria-invalid={durationError ? true : undefined}
              aria-describedby={durationError ? 'fat-duration-error' : undefined}
              onChange={(e) => changeDuration(e.target.value)}
            />
            {durationError && (
              <p id="fat-duration-error" className="field-error">
                {durationError}
              </p>
            )}
          </div>
          {peopleState.status === 'error' && (
            <p className="banner error" role="alert">
              Could not load people: {peopleState.error}
            </p>
          )}
          {peopleState.status === 'loading' && <p className="muted">Loading people…</p>}
          {peopleState.status === 'ready' && (
            <AttendeePicker people={people} selected={selected} onChange={changeSelection} />
          )}
        </aside>

        <div className="card fat-results">
          {notice && (
            <p className={`banner ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
              {notice.text}
            </p>
          )}

          <div className="fat-status">
            <p aria-live="polite" className="fat-summary">
              {summary}
            </p>
            {availability.status === 'ready' && availability.updatedAt && (
              <p className="muted">
                Updated {availability.updatedAt.toLocaleTimeString()} · refreshes every 10 s
                {availability.error && <span className="field-error"> · Last refresh failed</span>}
              </p>
            )}
          </div>

          {availability.status === 'idle' && <p className="muted">Pick at least one attendee.</p>}
          {availability.status === 'loading' && (
            <p className="muted" role="status">
              Loading availability…
            </p>
          )}
          {availability.status === 'error' && (
            <p className="banner error" role="alert">
              Could not load availability: {availability.error}{' '}
              <button type="button" onClick={() => void availability.refresh()}>
                Retry
              </button>
            </p>
          )}

          {availability.status === 'ready' && (
            <div className="timeline" role="group" aria-label={`Availability on ${date}, 09:00 to 18:00`}>
              <TimelineAxis />
              <div className="tl-people">
                {selectedPeople.map((person) => (
                  <AttendeeRow key={person.email} person={person} bookings={data[person.email] ?? NO_BOOKINGS} />
                ))}
              </div>
              <FreeSlotsRow slots={freeSlots} durationMinutes={deferredDuration} onSelect={setBookingSlot} />
              <p className="muted tl-hint">Use ← → to move between free slots and Enter to book one.</p>
            </div>
          )}
        </div>
      </div>

      {bookingSlot && (
        <BookSlotDialog
          slot={bookingSlot}
          durationMinutes={deferredDuration}
          date={date}
          attendees={selected}
          onClose={() => setBookingSlot(undefined)}
          onBooked={handleBooked}
          onConflict={handleConflict}
        />
      )}
    </section>
  )
}
