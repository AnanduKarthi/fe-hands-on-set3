import type { Booking, ISODate, Room } from './types'
import { parseTime } from '../lib/time'

export interface Seed {
  rooms: Room[]
  bookings: Booking[]
}

export const ROOMS: Room[] = [
  { id: 'aurora', name: 'Aurora', capacity: 4 },
  { id: 'borealis', name: 'Borealis', capacity: 8 },
  { id: 'cosmos', name: 'Cosmos', capacity: 12 },
  { id: 'atrium', name: 'Atrium', capacity: 40 },
]

let nextSeedId = 1

function seedBooking(
  roomId: string,
  date: ISODate,
  start: string,
  end: string,
  title: string,
  attendees: string[] = [],
): Booking {
  return {
    id: `seed-${nextSeedId++}`,
    roomId,
    date,
    start: parseTime(start),
    end: parseTime(end),
    title,
    attendees,
  }
}

/** Demo data for `date` (normally today). */
export function createSeed(date: ISODate): Seed {
  return {
    rooms: ROOMS,
    bookings: [
      seedBooking('aurora', date, '10:00', '11:00', 'Design review', ['ana@example.com']),
      seedBooking('aurora', date, '13:00', '13:30', '1:1 Ana / Ben', ['ana@example.com', 'ben@example.com']),
      seedBooking('aurora', date, '15:00', '16:30', 'Sprint planning'),
      seedBooking('borealis', date, '09:00', '09:15', 'Stand-up'),
      seedBooking('borealis', date, '11:30', '12:30', 'Hiring sync'),
      seedBooking('cosmos', date, '14:00', '17:00', 'Quarterly workshop'),
    ],
  }
}
