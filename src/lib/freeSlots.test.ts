import type { Interval } from '../api/types'
import { findCommonFreeSlots, mergeIntervals } from './freeSlots'
import { formatRange, parseTime } from './time'

const range = (start: string, end: string): Interval => ({ start: parseTime(start), end: parseTime(end) })
const show = (slots: Interval[]) => slots.map(formatRange)

describe('findCommonFreeSlots', () => {
  it('matches the acceptance example: A and B with overlapping bookings, D = 30', () => {
    const a = [range('10:00', '11:00'), range('09:30', '10:30')]
    const b = [range('13:00', '14:00'), range('13:15', '13:45')]
    expect(show(findCommonFreeSlots([...a, ...b], 30))).toEqual([
      '09:00–09:30',
      '11:00–13:00',
      '14:00–18:00',
    ])
  })

  it('returns the whole working day for an empty day', () => {
    expect(show(findCommonFreeSlots([], 30))).toEqual(['09:00–18:00'])
  })

  it('returns nothing for a fully booked day', () => {
    expect(findCommonFreeSlots([range('09:00', '18:00')], 15)).toEqual([])
  })

  it('returns nothing when back-to-back bookings cover the day', () => {
    expect(findCommonFreeSlots([range('09:00', '12:00'), range('12:00', '18:00')], 15)).toEqual([])
  })

  it('treats a booking inside another as one busy block', () => {
    expect(show(findCommonFreeSlots([range('10:00', '12:00'), range('10:30', '11:00')], 30))).toEqual([
      '09:00–10:00',
      '12:00–18:00',
    ])
  })

  it('handles unsorted bookings', () => {
    const unsorted = [range('15:00', '16:00'), range('09:00', '10:00'), range('12:00', '13:00')]
    expect(show(findCommonFreeSlots(unsorted, 60))).toEqual([
      '10:00–12:00',
      '13:00–15:00',
      '16:00–18:00',
    ])
  })

  it('includes a gap exactly equal to D and excludes one minute less', () => {
    const busy = [range('09:00', '10:00'), range('10:30', '18:00')]
    expect(show(findCommonFreeSlots(busy, 30))).toEqual(['10:00–10:30'])
    expect(findCommonFreeSlots(busy, 31)).toEqual([])
  })

  it('ignores parts of bookings outside 09:00–18:00', () => {
    const busy = [range('08:00', '09:30'), range('17:30', '19:00'), range('06:00', '07:00')]
    expect(show(findCommonFreeSlots(busy, 30))).toEqual(['09:30–17:30'])
  })

  it('does not mutate its input', () => {
    const busy = [range('11:00', '12:00'), range('10:00', '11:30')]
    const copy = structuredClone(busy)
    findCommonFreeSlots(busy, 30)
    expect(busy).toEqual(copy)
  })

  it('stays fast with 30 attendees × 20 bookings', () => {
    let seed = 1
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    const busy: Interval[] = []
    for (let i = 0; i < 30 * 20; i++) {
      const start = 480 + Math.floor(random() * 600)
      busy.push({ start, end: start + 15 + Math.floor(random() * 60) })
    }
    const t0 = performance.now()
    for (let d = 15; d <= 240; d += 15) findCommonFreeSlots(busy, d)
    expect((performance.now() - t0) / 16).toBeLessThan(5) // ms per run
  })
})

describe('mergeIntervals', () => {
  it('merges overlapping and touching intervals', () => {
    expect(show(mergeIntervals([range('10:00', '11:00'), range('09:00', '10:00'), range('10:30', '10:45')]))).toEqual([
      '09:00–11:00',
    ])
  })
})
