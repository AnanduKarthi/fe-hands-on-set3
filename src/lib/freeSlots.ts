import type { Interval, Minutes } from '../api/types'
import { WORKING_DAY } from './time'

/** Trims intervals to `window` and drops any that fall completely outside it. */
export function clipToWindow(intervals: readonly Interval[], window: Interval): Interval[] {
  const clipped: Interval[] = []
  for (const { start, end } of intervals) {
    const s = Math.max(start, window.start)
    const e = Math.min(end, window.end)
    if (s < e) clipped.push({ start: s, end: e })
  }
  return clipped
}

/**
 * Sorts and merges overlapping or touching intervals.
 * [09:30–10:30, 10:00–11:00] → [09:30–11:00]. Does not mutate the input. O(n log n).
 */
export function mergeIntervals(intervals: readonly Interval[]): Interval[] {
  const sorted = [...intervals].sort((a, b) => a.start - b.start)
  const merged: Interval[] = []
  for (const { start, end } of sorted) {
    const last = merged[merged.length - 1]
    if (last && start <= last.end) {
      last.end = Math.max(last.end, end)
    } else {
      merged.push({ start, end })
    }
  }
  return merged
}

/** Gaps inside `window` between already merged, sorted busy intervals. */
export function gapsBetween(merged: readonly Interval[], window: Interval): Interval[] {
  const gaps: Interval[] = []
  let cursor = window.start
  for (const { start, end } of merged) {
    if (start > cursor) gaps.push({ start: cursor, end: Math.min(start, window.end) })
    cursor = Math.max(cursor, end)
    if (cursor >= window.end) break
  }
  if (cursor < window.end) gaps.push({ start: cursor, end: window.end })
  return gaps
}

/** Keeps gaps at least `minDuration` minutes long (a gap exactly equal to it counts). */
export function atLeast(gaps: readonly Interval[], minDuration: Minutes): Interval[] {
  return gaps.filter((g) => g.end - g.start >= minDuration)
}

/**
 * Common free slots: every period of at least `minDuration` minutes inside
 * `window` (default 09:00–18:00) when nobody in `busy` is booked.
 *
 * `busy` is everyone's bookings in one flat list, in any order, possibly
 * overlapping or extending past the window.
 */
export function findCommonFreeSlots(
  busy: readonly Interval[],
  minDuration: Minutes,
  window: Interval = WORKING_DAY,
): Interval[] {
  const merged = mergeIntervals(clipToWindow(busy, window))
  return atLeast(gapsBetween(merged, window), minDuration)
}
