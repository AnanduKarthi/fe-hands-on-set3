import type { Booking } from '../api/types'
import { parseTime } from './time'
import { emailError, validateBooking, type BookingDraft } from './validateBooking'

const t = parseTime

function booking(start: string, end: string, title = 'Existing'): Booking {
  return { id: title, roomId: 'r1', date: '2026-10-29', start: t(start), end: t(end), title, attendees: [] }
}

function draft(start: string, end: string, overrides: Partial<BookingDraft> = {}): BookingDraft {
  return { title: 'Planning', start: t(start), end: t(end), attendees: [], ...overrides }
}

describe('validateBooking', () => {
  describe('overlaps (acceptance criteria)', () => {
    const existing = [booking('10:00', '11:00', 'Design review')]

    it('blocks 10:30–11:30 when 10:00–11:00 is booked, with a clear message', () => {
      expect(validateBooking(draft('10:30', '11:30'), existing).time).toMatch(
        /Overlaps “Design review” \(10:00–11:00\)/,
      )
    })

    it('allows the back-to-back 11:00–12:00', () => {
      expect(validateBooking(draft('11:00', '12:00'), existing)).toEqual({})
    })

    it('allows a booking that ends exactly when the existing one starts', () => {
      expect(validateBooking(draft('09:00', '10:00'), existing)).toEqual({})
    })

    it('blocks a booking that completely covers an existing one (09:00–12:00 over 10:00–10:30)', () => {
      const errors = validateBooking(draft('09:00', '12:00'), [booking('10:00', '10:30')])
      expect(errors.time).toMatch(/Overlaps/)
    })

    it('blocks a booking completely inside an existing one', () => {
      expect(validateBooking(draft('10:15', '10:45'), existing).time).toMatch(/Overlaps/)
    })

    it('lists every booking it overlaps in time order', () => {
      const errors = validateBooking(draft('09:00', '13:00'), [
        booking('12:00', '12:30', 'Lunch talk'),
        booking('09:30', '10:00', 'Stand-up'),
      ])
      expect(errors.time).toMatch(/“Stand-up”.*“Lunch talk”/)
    })
  })

  describe('time range', () => {
    it('rejects a start before 09:00', () => {
      expect(validateBooking(draft('08:45', '09:30'), []).start).toMatch(/between 09:00 and 17:45/)
    })

    it('rejects an end after 18:00', () => {
      expect(validateBooking(draft('17:00', '18:15'), []).end).toMatch(/between 09:15 and 18:00/)
    })

    it('allows a booking that ends exactly at 18:00', () => {
      expect(validateBooking(draft('17:00', '18:00'), [])).toEqual({})
    })

    it('rejects start equal to or after end', () => {
      expect(validateBooking(draft('11:00', '11:00'), []).end).toBe('End must be after start')
      expect(validateBooking(draft('12:00', '11:00'), []).end).toBe('End must be after start')
    })

    it('allows exactly 4 hours but not more', () => {
      expect(validateBooking(draft('09:00', '13:00'), [])).toEqual({})
      expect(validateBooking(draft('09:00', '13:15'), []).end).toMatch(/at most 4 hours/)
    })

    it('rejects times that are not on a 15-minute step', () => {
      expect(validateBooking({ ...draft('09:00', '10:00'), start: t('09:10') }, []).start).toMatch(
        /15-minute/,
      )
    })

    it('skips the overlap check while the range itself is invalid', () => {
      const errors = validateBooking(draft('11:00', '10:00'), [booking('10:00', '11:00')])
      expect(errors.time).toBeUndefined()
    })
  })

  describe('title and attendees', () => {
    it('requires a title', () => {
      expect(validateBooking(draft('09:00', '10:00', { title: '   ' }), []).title).toBe('Enter a title')
    })

    it('rejects invalid emails', () => {
      const errors = validateBooking(draft('09:00', '10:00', { attendees: ['not-an-email'] }), [])
      expect(errors.attendees).toMatch(/not a valid email/)
    })

    it('rejects duplicate emails, ignoring case', () => {
      const errors = validateBooking(
        draft('09:00', '10:00', { attendees: ['ana@example.com', 'ANA@example.com'] }),
        [],
      )
      expect(errors.attendees).toMatch(/more than once/)
    })
  })
})

describe('emailError', () => {
  it('accepts a new valid email', () => {
    expect(emailError('ben@example.com', ['ana@example.com'])).toBeUndefined()
  })

  it('rejects an empty, invalid or duplicate email', () => {
    expect(emailError('  ', [])).toBe('Enter an email address')
    expect(emailError('ben@', [])).toMatch(/not a valid email/)
    expect(emailError(' Ana@Example.com ', ['ana@example.com'])).toMatch(/already added/)
  })
})
