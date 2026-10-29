import type { Interval } from '../../api/types'
import { DAY_END, DAY_START, formatTime } from '../../lib/time'

const SPAN = DAY_END - DAY_START

/** CSS position of an interval on the 09:00–18:00 track, clipped to the track. */
export function trackStyle({ start, end }: Interval): { left: string; width: string } {
  const s = Math.max(start, DAY_START)
  const e = Math.min(end, DAY_END)
  return { left: `${((s - DAY_START) / SPAN) * 100}%`, width: `${((e - s) / SPAN) * 100}%` }
}

export function isOnTrack({ start, end }: Interval): boolean {
  return start < DAY_END && end > DAY_START
}

/** Screen reader label for a free slot, e.g. "Free 11:00 to 13:00". */
export function slotLabel(slot: Interval): string {
  return `Free ${formatTime(slot.start)} to ${formatTime(slot.end)}`
}
