import type { ISODate, Interval, Minutes } from '../api/types'

export const DAY_START: Minutes = 9 * 60
export const DAY_END: Minutes = 18 * 60
export const STEP_MINUTES = 15
export const WORKING_DAY: Interval = { start: DAY_START, end: DAY_END }

/** 570 → "09:30" */
export function formatTime(minutes: Minutes): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** "09:30" → 570 */
export function parseTime(value: string): Minutes {
  const [h, m] = value.split(':').map(Number)
  return h * 60 + m
}

export function formatRange({ start, end }: Interval): string {
  return `${formatTime(start)}–${formatTime(end)}`
}

/** Every `step` minutes from `from` to `to`, inclusive. */
export function timeSteps(from: Minutes, to: Minutes, step = STEP_MINUTES): Minutes[] {
  const steps: Minutes[] = []
  for (let t = from; t <= to; t += step) steps.push(t)
  return steps
}

export function toISODate(date: Date): ISODate {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayISO(): ISODate {
  return toISODate(new Date())
}

export function isISODate(value: string | null): value is ISODate {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}
