import { createMockApi } from './mockApi'
import type { NewBooking } from './types'

const DATE = '2026-10-29'
const seed = {
  rooms: [{ id: 'r1', name: 'Room 1', capacity: 4 }],
  bookings: [
    { id: 's1', roomId: 'r1', date: DATE, start: 600, end: 660, title: 'Existing', attendees: [] },
  ],
}
const draft = (start: number, end: number): NewBooking => ({
  roomId: 'r1',
  date: DATE,
  start,
  end,
  title: 'New',
  attendees: [],
})

function fastApi(random = () => 0.5) {
  return createMockApi({ latency: { min: 0, max: 0 }, random, seed })
}

describe('mock API', () => {
  it('creates a back-to-back booking', async () => {
    const api = fastApi()
    await api.createBooking(draft(660, 720))
    expect((await api.getBookings('r1', DATE)).map((b) => b.start)).toEqual([600, 660])
  })

  it('rejects an overlapping booking with a conflict', async () => {
    const api = fastApi()
    await expect(api.createBooking(draft(630, 690))).rejects.toMatchObject({ kind: 'conflict' })
  })

  it('fails with a server error when the random roll is under the failure rate', async () => {
    const api = fastApi(() => 0.05)
    await expect(api.createBooking(draft(720, 780))).rejects.toMatchObject({ kind: 'server' })
  })

  it('returns copies so callers cannot mutate the store', async () => {
    const api = fastApi()
    const [first] = await api.getBookings('r1', DATE)
    first.title = 'Mutated'
    expect((await api.getBookings('r1', DATE))[0].title).toBe('Existing')
  })
})
