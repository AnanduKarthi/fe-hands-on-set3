import { memo } from 'react'
import type { Booking, Person } from '../../api/types'
import { clipToWindow, mergeIntervals } from '../../lib/freeSlots'
import { WORKING_DAY, formatRange } from '../../lib/time'
import { isOnTrack, trackStyle } from './timelineScale'

interface Props {
  person: Person
  bookings: Booking[]
}

/** One attendee's busy blocks. Memoised so changing D doesn't re-render 30 rows. */
export const AttendeeRow = memo(function AttendeeRow({ person, bookings }: Props) {
  const busy = mergeIntervals(clipToWindow(bookings, WORKING_DAY))
  const summary = busy.length ? `Busy ${busy.map(formatRange).join(', ')}` : 'Free all day'

  return (
    <div className="tl-row">
      <div className="tl-label" title={person.email}>
        {person.name}
      </div>
      <div className="tl-track">
        {bookings.filter(isOnTrack).map((b) => (
          <div
            key={b.id}
            className="tl-busy"
            style={trackStyle(b)}
            title={`${b.title} · ${formatRange(b)}`}
            aria-hidden="true"
          />
        ))}
        <span className="visually-hidden">{summary}</span>
      </div>
    </div>
  )
})
