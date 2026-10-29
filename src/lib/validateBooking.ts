import type { Booking, Interval } from '../api/types'
import { byStart, overlaps } from './intervals'
import { DAY_END, DAY_START, STEP_MINUTES, formatRange, formatTime } from './time'

export interface BookingDraft extends Interval {
  title: string
  attendees: string[]
}

/** `time` holds errors about the start/end pair as a whole (overlaps). */
export type BookingField = 'title' | 'start' | 'end' | 'time' | 'attendees'
export type FieldErrors = Partial<Record<BookingField, string>>

export const MAX_DURATION_MINUTES = 4 * 60
export const MAX_TITLE_LENGTH = 80
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email)
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/** Error for adding `email` to `current`, or undefined if it can be added. */
export function emailError(email: string, current: string[]): string | undefined {
  const value = normalizeEmail(email)
  if (!value) return 'Enter an email address'
  if (!isValidEmail(value)) return `“${email.trim()}” is not a valid email address`
  if (current.some((e) => normalizeEmail(e) === value)) return `${value} is already added`
  return undefined
}

function validateTitle(title: string): string | undefined {
  if (!title.trim()) return 'Enter a title'
  if (title.trim().length > MAX_TITLE_LENGTH) return `Keep the title under ${MAX_TITLE_LENGTH} characters`
  return undefined
}

function validateStart(start: number): string | undefined {
  if (start < DAY_START || start >= DAY_END) {
    return `Start must be between ${formatTime(DAY_START)} and ${formatTime(DAY_END - STEP_MINUTES)}`
  }
  if (start % STEP_MINUTES !== 0) return `Use ${STEP_MINUTES}-minute steps`
  return undefined
}

function validateEnd(start: number, end: number): string | undefined {
  if (end <= DAY_START || end > DAY_END) {
    return `End must be between ${formatTime(DAY_START + STEP_MINUTES)} and ${formatTime(DAY_END)}`
  }
  if (end % STEP_MINUTES !== 0) return `Use ${STEP_MINUTES}-minute steps`
  if (end <= start) return 'End must be after start'
  if (end - start > MAX_DURATION_MINUTES) return 'A booking can last at most 4 hours'
  return undefined
}

function validateAttendees(attendees: string[]): string | undefined {
  const seen = new Set<string>()
  for (const raw of attendees) {
    const email = normalizeEmail(raw)
    if (!isValidEmail(email)) return `“${raw}” is not a valid email address`
    if (seen.has(email)) return `${email} is listed more than once`
    seen.add(email)
  }
  return undefined
}

function validateOverlap(range: Interval, existing: Booking[]): string | undefined {
  const conflicts = existing.filter((b) => overlaps(b, range)).sort(byStart)
  if (conflicts.length === 0) return undefined
  const list = conflicts.map((b) => `“${b.title}” (${formatRange(b)})`).join(', ')
  return `Overlaps ${list}. Choose a time that starts when it ends or ends when it starts.`
}

/**
 * Checks a booking against the rules and the room's existing bookings for that day.
 * Returns one message per field. An empty object means the draft is valid.
 */
export function validateBooking(draft: BookingDraft, existing: Booking[]): FieldErrors {
  const errors: FieldErrors = {
    title: validateTitle(draft.title),
    start: validateStart(draft.start),
    end: validateEnd(draft.start, draft.end),
    attendees: validateAttendees(draft.attendees),
  }
  // Only check overlaps once the range itself is valid, so we don't show two errors for one mistake.
  if (!errors.start && !errors.end) errors.time = validateOverlap(draft, existing)

  return Object.fromEntries(
    Object.entries(errors).filter(([, message]) => message !== undefined),
  ) as FieldErrors
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0
}
