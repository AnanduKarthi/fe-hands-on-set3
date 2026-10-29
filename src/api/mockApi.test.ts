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

describe('mock API — people and group bookings', () => {
  const groupSeed = {
    ...seed,
    people: [
      { email: 'a@x.com', name: 'A' },
      { email: 'b@x.com', name: 'B' },
    ],
    bookings: [
      ...seed.bookings,
      { id: 'p1', roomId: 'elsewhere', date: DATE, start: 600, end: 660, title: 'A1', attendees: ['a@x.com'] },
      { id: 'p2', roomId: 'elsewhere', date: DATE, start: 570, end: 630, title: 'A2', attendees: ['a@x.com'] },
      { id: 'p3', roomId: 'elsewhere', date: '2026-10-30', start: 600, end: 660, title: 'Other day', attendees: ['b@x.com'] },
    ],
  }
  const group = (start: number, end: number): NewBooking => ({
    ...draft(start, end),
    attendees: ['a@x.com', 'b@x.com'],
  })

  function groupApi(random = () => 0.5) {
    return createMockApi({ latency: { min: 0, max: 0 }, random, seed: groupSeed })
  }

  it('returns each person’s bookings for the date, sorted and possibly overlapping', async () => {
    const result = await groupApi().getBookingsForPeople(['a@x.com', 'b@x.com'], DATE)
    expect(result['a@x.com'].map((b) => b.title)).toEqual(['A2', 'A1'])
    expect(result['b@x.com']).toEqual([])
  })

  it('books a group when the room and every attendee are free', async () => {
    const api = groupApi()
    await api.createGroupBooking(group(720, 750))
    const result = await api.getBookingsForPeople(['b@x.com'], DATE)
    expect(result['b@x.com']).toHaveLength(1)
  })

  it('rejects with a conflict when an attendee is busy', async () => {
    await expect(groupApi().createGroupBooking({ ...group(570, 600), roomId: 'r2' })).rejects.toMatchObject({
      kind: 'conflict',
      message: expect.stringContaining('a@x.com'),
    })
  })

  it('sometimes loses the slot to another user, and the slot then shows as busy', async () => {
    const api = groupApi(() => 0.15) // above the 10% failure rate, below the 20% conflict rate
    await expect(api.createGroupBooking(group(720, 750))).rejects.toMatchObject({ kind: 'conflict' })
    const result = await api.getBookingsForPeople(['a@x.com', 'b@x.com'], DATE)
    const all = [...result['a@x.com'], ...result['b@x.com']]
    expect(all.some((b) => b.title === 'Booked by someone else' && b.start === 720)).toBe(true)
  })
})
