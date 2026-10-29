import type { Interval, Room } from '../../api/types'
import { overlaps } from '../../lib/intervals'
import { STEP_MINUTES } from '../../lib/time'
import type { RoomDay } from './useRoomsWithBookings'

/** Rooms that seat `groupSize` and are free for `range`, smallest first. */
export function roomsThatFit(rooms: RoomDay[], groupSize: number, range: Interval): Room[] {
  return rooms
    .filter(({ room, bookings }) => room.capacity >= groupSize && !bookings.some((b) => overlaps(b, range)))
    .map(({ room }) => room)
    .sort((a, b) => a.capacity - b.capacity)
}

/** Start times inside the slot where a meeting of `duration` still fits: the slot start, then 15-minute steps. */
export function startOptions(slot: Interval, duration: number): number[] {
  const options: number[] = []
  if (slot.start + duration <= slot.end) options.push(slot.start)
  const firstStep = Math.floor(slot.start / STEP_MINUTES) * STEP_MINUTES + STEP_MINUTES
  for (let t = firstStep; t + duration <= slot.end; t += STEP_MINUTES) options.push(t)
  return options
}
