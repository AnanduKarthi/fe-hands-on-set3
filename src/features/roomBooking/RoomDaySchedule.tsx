import type { Booking } from '../../api/types'
import { DAY_END, DAY_START, formatRange } from '../../lib/time'

type AgendaItem = { kind: 'booking'; booking: Booking } | { kind: 'free'; start: number; end: number }

/** Bookings in time order with the free gaps between them, from 09:00 to 18:00. */
function buildAgenda(bookings: Booking[]): AgendaItem[] {
  const items: AgendaItem[] = []
  let cursor = DAY_START
  for (const booking of bookings) {
    if (booking.start > cursor) items.push({ kind: 'free', start: cursor, end: booking.start })
    items.push({ kind: 'booking', booking })
    cursor = Math.max(cursor, booking.end)
  }
  if (cursor < DAY_END) items.push({ kind: 'free', start: cursor, end: DAY_END })
  return items
}

interface Props {
  bookings: Booking[]
}

export function RoomDaySchedule({ bookings }: Props) {
  const agenda = buildAgenda(bookings)

  return (
    <ol className="agenda" aria-label="Bookings from 09:00 to 18:00">
      {agenda.map((item) =>
        item.kind === 'free' ? (
          <li key={`free-${item.start}`} className="agenda-free">
            <span className="agenda-time">{formatRange(item)}</span>
            <span className="muted">Free</span>
          </li>
        ) : (
          <li key={item.booking.id} className="agenda-booking">
            <span className="agenda-time">{formatRange(item.booking)}</span>
            <span className="agenda-title">{item.booking.title}</span>
            {item.booking.attendees.length > 0 && (
              <span className="muted agenda-attendees">{item.booking.attendees.join(', ')}</span>
            )}
          </li>
        ),
      )}
    </ol>
  )
}
