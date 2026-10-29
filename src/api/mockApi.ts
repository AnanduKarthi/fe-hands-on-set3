import { delay } from './delay'
import { createSeed, ELSEWHERE, type Seed } from './seed'
import {
  ApiError,
  type Availability,
  type Booking,
  type ISODate,
  type NewBooking,
  type Person,
  type Room,
} from './types'
import { byStart, overlaps } from '../lib/intervals'
import { formatRange, todayISO } from '../lib/time'

export interface BookingApi {
  getRooms(signal?: AbortSignal): Promise<Room[]>
  getBookings(roomId: string, date: ISODate, signal?: AbortSignal): Promise<Booking[]>
  createBooking(input: NewBooking): Promise<Booking>
  cancelBooking(id: string): Promise<void>
  /** Dev helper: books a slot instantly, as if another user did it in another tab. */
  simulateExternalBooking(input: NewBooking): Booking
  getPeople(signal?: AbortSignal): Promise<Person[]>
  /** All bookings on `date` that each person attends. One person's bookings may overlap. */
  getBookingsForPeople(emails: string[], date: ISODate, signal?: AbortSignal): Promise<Availability>
  /**
   * Books a room for a group. Rejects with a `conflict` if the room or any attendee
   * is already busy. Sometimes another user grabs the slot first (`groupConflictRate`).
   */
  createGroupBooking(input: NewBooking): Promise<Booking>
}

export interface MockApiOptions {
  /** Latency range in ms for every call. */
  latency?: { min: number; max: number }
  /** Injectable for deterministic tests. Returns [0, 1). */
  random?: () => number
  createFailureRate?: number
  cancelFailureRate?: number
  /** Chance that another user books one attendee right before a group booking lands. */
  groupConflictRate?: number
  seed?: Seed
}

/**
 * In-memory fake backend. All data lives in this closure, and every call waits a
 * random 300–800 ms by default. Returned objects are copies, so callers can't mutate the store.
 */
export function createMockApi(options: MockApiOptions = {}): BookingApi {
  const {
    latency = { min: 300, max: 800 },
    random = Math.random,
    createFailureRate = 0.1,
    cancelFailureRate = 0.1,
    groupConflictRate = 0.2,
    seed = createSeed(todayISO()),
  } = options

  const rooms: Room[] = structuredClone(seed.rooms)
  const people: Person[] = structuredClone(seed.people ?? [])
  let bookings: Booking[] = structuredClone(seed.bookings)
  let nextId = 1

  const wait = (signal?: AbortSignal) =>
    delay(latency.min + random() * (latency.max - latency.min), signal)

  function findConflict(input: NewBooking): Booking | undefined {
    return bookings.find(
      (b) => b.roomId === input.roomId && b.date === input.date && overlaps(b, input),
    )
  }

  function bookingsFor(email: string, date: ISODate): Booking[] {
    return bookings.filter((b) => b.date === date && b.attendees.includes(email))
  }

  function insert(input: NewBooking): Booking {
    const booking: Booking = { ...structuredClone(input), id: `bk-${nextId++}` }
    bookings.push(booking)
    return booking
  }

  return {
    async getRooms(signal) {
      await wait(signal)
      return structuredClone(rooms)
    },

    async getBookings(roomId, date, signal) {
      await wait(signal)
      return structuredClone(
        bookings.filter((b) => b.roomId === roomId && b.date === date).sort(byStart),
      )
    },

    async createBooking(input) {
      await wait()
      if (random() < createFailureRate) {
        throw new ApiError('server', 'The booking service is unavailable. Please try again.')
      }
      const conflict = findConflict(input)
      if (conflict) {
        throw new ApiError(
          'conflict',
          `This room was just booked by someone else (“${conflict.title}”, ${formatRange(conflict)}).`,
        )
      }
      return structuredClone(insert(input))
    },

    async cancelBooking(id) {
      await wait()
      if (random() < cancelFailureRate) {
        throw new ApiError('server', 'Could not cancel the booking. Please try again.')
      }
      if (!bookings.some((b) => b.id === id)) {
        throw new ApiError('not_found', 'This booking no longer exists.')
      }
      bookings = bookings.filter((b) => b.id !== id)
    },

    simulateExternalBooking(input) {
      return structuredClone(insert(input))
    },

    async getPeople(signal) {
      await wait(signal)
      return structuredClone(people)
    },

    async getBookingsForPeople(emails, date, signal) {
      await wait(signal)
      const result: Availability = {}
      for (const email of emails) result[email] = structuredClone(bookingsFor(email, date).sort(byStart))
      return result
    },

    async createGroupBooking(input) {
      await wait()
      if (random() < createFailureRate) {
        throw new ApiError('server', 'The booking service is unavailable. Please try again.')
      }
      if (input.attendees.length > 0 && random() < groupConflictRate) {
        // Another user books one of the attendees just before us.
        const email = input.attendees[Math.floor(random() * input.attendees.length)]
        insert({
          roomId: ELSEWHERE,
          date: input.date,
          start: input.start,
          end: input.end,
          title: 'Booked by someone else',
          attendees: [email],
        })
      }
      const roomConflict = findConflict(input)
      if (roomConflict) {
        throw new ApiError('conflict', `The room was just booked by someone else (${formatRange(roomConflict)}).`)
      }
      const busy = input.attendees.filter((email) =>
        bookingsFor(email, input.date).some((b) => overlaps(b, input)),
      )
      if (busy.length > 0) {
        throw new ApiError(
          'conflict',
          `${busy.join(', ')} ${busy.length === 1 ? 'is' : 'are'} no longer free at ${formatRange(input)}.`,
        )
      }
      return structuredClone(insert(input))
    },
  }
}
