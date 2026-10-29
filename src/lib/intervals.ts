import type { Interval } from '../api/types'

/** Half-open overlap test: [10:00, 11:00) and [11:00, 12:00) do not overlap. */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end
}

export function byStart<T extends Interval>(a: T, b: T): number {
  return a.start - b.start || a.end - b.end
}
