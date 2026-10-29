/** Minutes since midnight, e.g. 09:30 → 570. */
export type Minutes = number

/** ISO calendar date, `YYYY-MM-DD`. */
export type ISODate = string

/** Half-open time range `[start, end)`, so back-to-back ranges do not overlap. */
export interface Interval {
  start: Minutes
  end: Minutes
}

export interface Room {
  id: string
  name: string
  capacity: number
}

export interface Person {
  email: string
  name: string
}

export interface Booking extends Interval {
  id: string
  roomId: string
  date: ISODate
  title: string
  attendees: string[]
}

export type NewBooking = Omit<Booking, 'id'>

/** Each person's bookings for one day, keyed by email. */
export type Availability = Record<string, Booking[]>

export type ApiErrorKind = 'conflict' | 'server' | 'not_found'

export class ApiError extends Error {
  readonly kind: ApiErrorKind

  constructor(kind: ApiErrorKind, message: string) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong'
}
