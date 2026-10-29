import type { Booking, ISODate, Person, Room } from './types'
import { parseTime } from '../lib/time'

export interface Seed {
  rooms: Room[]
  bookings: Booking[]
  people?: Person[]
}

export const ROOMS: Room[] = [
  { id: 'aurora', name: 'Aurora', capacity: 4 },
  { id: 'borealis', name: 'Borealis', capacity: 8 },
  { id: 'cosmos', name: 'Cosmos', capacity: 12 },
  { id: 'atrium', name: 'Atrium', capacity: 40 },
]

/** Room id for meetings held outside the bookable rooms (calls, offsite). Never shown in Q1. */
export const ELSEWHERE = 'elsewhere'

export const PERSON_A: Person = { email: 'a@example.com', name: 'Attendee A' }
export const PERSON_B: Person = { email: 'b@example.com', name: 'Attendee B' }

const TEAM_NAMES = [
  'Ana', 'Ben', 'Chloe', 'Dev', 'Elif', 'Femi', 'Grace', 'Hiro', 'Ines', 'Jonas',
  'Kai', 'Lena', 'Malik', 'Nora', 'Omar', 'Priya', 'Quinn', 'Rosa', 'Sven', 'Tara',
  'Umar', 'Vera', 'Wen', 'Ximena', 'Yusuf', 'Zoe', 'Aditi', 'Bruno', 'Carmen', 'Diego',
]

export const TEAM: Person[] = TEAM_NAMES.map((name) => ({
  email: `${name.toLowerCase()}@example.com`,
  name,
}))

export const BOOKINGS_PER_TEAM_MEMBER = 20

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

/** Small deterministic PRNG so the demo data is the same on every load. */
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 20 bookings per team member, deliberately overlapping and sometimes starting
 * before 09:00. Lunch (12:00–13:00) and late afternoon are kept clear, so the
 * whole team still has common free time.
 */
function teamBookings(date: ISODate): Booking[] {
  const random = mulberry32(42)
  const windows = [
    { from: 8 * 60 + 30, to: 12 * 60 },
    { from: 13 * 60, to: 16 * 60 + 30 },
  ]
  const bookings: Booking[] = []
  for (const person of TEAM) {
    for (let i = 0; i < BOOKINGS_PER_TEAM_MEMBER; i++) {
      const window = windows[i % windows.length]
      const length = 15 * (1 + Math.floor(random() * 3)) // 15, 30 or 45 min
      const slots = (window.to - window.from - length) / 15
      const start = window.from + 15 * Math.floor(random() * (slots + 1))
      bookings.push({
        id: `seed-${nextSeedId++}`,
        roomId: ELSEWHERE,
        date,
        start,
        end: start + length,
        title: `${person.name}'s meeting ${i + 1}`,
        attendees: [person.email],
      })
    }
  }
  return bookings
}

/** Demo data for `date` (normally today). */
export function createSeed(date: ISODate): Seed {
  return {
    rooms: ROOMS,
    people: [PERSON_A, PERSON_B, ...TEAM],
    bookings: [
      seedBooking('aurora', date, '10:00', '11:00', 'Design review', ['ana@example.com']),
      seedBooking('aurora', date, '13:00', '13:30', '1:1 Ana / Ben', ['ana@example.com', 'ben@example.com']),
      seedBooking('aurora', date, '15:00', '16:30', 'Sprint planning'),
      seedBooking('borealis', date, '09:00', '09:15', 'Stand-up'),
      seedBooking('borealis', date, '11:30', '12:30', 'Hiring sync'),
      seedBooking('cosmos', date, '14:00', '17:00', 'Quarterly workshop'),
      // Q2 acceptance example: A and B each have overlapping bookings.
      seedBooking(ELSEWHERE, date, '10:00', '11:00', 'Customer call', [PERSON_A.email]),
      seedBooking(ELSEWHERE, date, '09:30', '10:30', 'Interview', [PERSON_A.email]),
      seedBooking(ELSEWHERE, date, '13:00', '14:00', 'Offsite lunch', [PERSON_B.email]),
      seedBooking(ELSEWHERE, date, '13:15', '13:45', 'Quick sync', [PERSON_B.email]),
      ...teamBookings(date),
    ],
  }
}
