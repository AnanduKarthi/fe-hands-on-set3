import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ApiContext } from '../../api/ApiContext'
import { createMockApi } from '../../api/mockApi'
import { TEAM } from '../../api/seed'
import { ApiError, type Availability, type Booking } from '../../api/types'
import { todayISO } from '../../lib/time'
import { FindATimePage } from './FindATimePage'

const DATE = todayISO()

function personal(id: string, email: string, start: number, end: number): Booking {
  return { id, roomId: 'elsewhere', date: DATE, start, end, title: id, attendees: [email] }
}

const seed = {
  rooms: [
    { id: 'small', name: 'Small', capacity: 2 },
    { id: 'big', name: 'Big', capacity: 10 },
  ],
  people: [
    { email: 'a@example.com', name: 'Attendee A' },
    { email: 'b@example.com', name: 'Attendee B' },
    { email: 'c@example.com', name: 'Carla' },
  ],
  bookings: [
    personal('a1', 'a@example.com', 600, 660), // 10:00–11:00
    personal('a2', 'a@example.com', 570, 630), // 09:30–10:30
    personal('b1', 'b@example.com', 780, 840), // 13:00–14:00
    personal('b2', 'b@example.com', 795, 825), // 13:15–13:45
    personal('c1', 'c@example.com', 540, 1020), // 09:00–17:00
  ],
}

function setup() {
  const api = createMockApi({ latency: { min: 0, max: 0 }, random: () => 0.5, seed })
  render(
    <ApiContext.Provider value={api}>
      <MemoryRouter>
        <FindATimePage />
      </MemoryRouter>
    </ApiContext.Provider>,
  )
  return { api, user: userEvent.setup() }
}

const slotLabels = async () =>
  (await screen.findAllByRole('option')).map((o) => o.getAttribute('aria-label'))

describe('FindATimePage', () => {
  it('shows exactly the acceptance free slots for A and B with D = 30', async () => {
    setup()
    expect(await slotLabels()).toEqual(['Free 09:00 to 09:30', 'Free 11:00 to 13:00', 'Free 14:00 to 18:00'])
    expect(screen.getByText('3 common free slots of at least 30 minutes.')).toBeInTheDocument()
  })

  it('recalculates when D changes without fetching again', async () => {
    const { api, user } = setup()
    await slotLabels()
    const fetchSpy = vi.spyOn(api, 'getBookingsForPeople')

    const input = screen.getByLabelText('Meeting length (minutes)')
    await user.clear(input)
    await user.type(input, '60')
    expect(await slotLabels()).toEqual(['Free 11:00 to 13:00', 'Free 14:00 to 18:00'])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('shows an error for an invalid length and keeps the last valid result', async () => {
    const { user } = setup()
    await slotLabels()
    const input = screen.getByLabelText('Meeting length (minutes)')
    await user.clear(input)
    await user.type(input, '0')
    expect(screen.getByText(/whole minutes between 5 and 540/)).toBeInTheDocument()
    expect(await slotLabels()).toHaveLength(3)
  })

  it('never shows an older selection’s result when responses arrive out of order', async () => {
    const { api, user } = setup()
    await slotLabels()

    const pending: { emails: string[]; resolve: (a: Availability) => void }[] = []
    vi.spyOn(api, 'getBookingsForPeople').mockImplementation(
      (emails) => new Promise((resolve) => pending.push({ emails, resolve })),
    )

    // Selection 1: A + B + Carla (Carla is busy 09:00–17:00). Selection 2: just Carla.
    await user.click(screen.getByLabelText(/Carla/))
    await user.click(screen.getByLabelText(/Attendee A/))
    await user.click(screen.getByLabelText(/Attendee B/))
    expect(screen.getByRole('status')).toHaveTextContent('Loading availability…')

    const latest = pending[pending.length - 1]
    expect(latest.emails).toEqual(['c@example.com'])

    // The newest response lands first…
    await act(async () => latest.resolve({ 'c@example.com': [seed.bookings[4]] }))
    expect(await slotLabels()).toEqual(['Free 17:00 to 18:00'])

    // …then an older, slower one for a previous selection arrives. It must be ignored.
    await act(async () => pending[0].resolve({ 'a@example.com': [], 'b@example.com': [], 'c@example.com': [] }))
    expect(await slotLabels()).toEqual(['Free 17:00 to 18:00'])
  })

  it('shows loading, not the previous result, while the new selection is in flight', async () => {
    const { api, user } = setup()
    await slotLabels()
    vi.spyOn(api, 'getBookingsForPeople').mockImplementation(() => new Promise(() => {}))
    await user.click(screen.getByLabelText(/Carla/))
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(screen.getByRole('status')).toHaveTextContent('Loading availability…')
  })

  it('books a free slot in the smallest room that fits the group', async () => {
    const { api, user } = setup()
    const createSpy = vi.spyOn(api, 'createGroupBooking')
    await user.click((await screen.findAllByRole('option'))[1]) // 11:00–13:00

    const dialog = await screen.findByRole('dialog', { name: 'Book 11:00–11:30' })
    expect(await within(dialog).findByLabelText('Room')).toHaveValue('small')
    await user.click(within(dialog).getByRole('button', { name: 'Book' }))

    expect(await screen.findByText(/Booked “Team meeting” 11:00–11:30 in Small/)).toBeInTheDocument()
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({ roomId: 'small', start: 660, end: 690, attendees: ['a@example.com', 'b@example.com'] }),
    )
    expect(await slotLabels()).toEqual(['Free 09:00 to 09:30', 'Free 11:30 to 13:00', 'Free 14:00 to 18:00'])
  })

  it('shows the conflict and recalculates when someone else booked the slot meanwhile', async () => {
    const { api, user } = setup()
    vi.spyOn(api, 'createGroupBooking').mockImplementation(async (input) => {
      api.simulateExternalBooking({ ...input, roomId: 'elsewhere', title: 'Taken', attendees: ['a@example.com'] })
      throw new ApiError('conflict', 'a@example.com is no longer free at 14:00–14:30.')
    })
    await screen.findAllByRole('option')

    // Keyboard only: Tab to the slots, move to the last one, Enter to book.
    const first = screen.getAllByRole('option')[0]
    act(() => first.focus())
    await user.keyboard('{End}{Enter}')
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByLabelText('Room')
    await user.click(within(dialog).getByRole('button', { name: 'Book' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/no longer free.*recalculated/)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByRole('option', { name: 'Free 14:30 to 18:00' })).toBeInTheDocument()
  })

  it('stays responsive when changing D with 30 attendees × 20 bookings, without refetching', async () => {
    const bookings = TEAM.flatMap((p, i) =>
      Array.from({ length: 20 }, (_, j) => {
        const start = 480 + ((i * 7 + j * 31) % 560)
        return personal(`${p.email}-${j}`, p.email, start, start + 15 + (j % 3) * 15)
      }),
    )
    const api = createMockApi({
      latency: { min: 0, max: 0 },
      random: () => 0.5,
      seed: { ...seed, people: TEAM, bookings },
    })
    render(
      <ApiContext.Provider value={api}>
        <FindATimePage />
      </ApiContext.Provider>,
    )
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Whole team (30)' }))
    await screen.findByText(/common free slots? of at least 30 minutes/)
    const timeline = screen.getByRole('group', { name: /Availability on/ })
    expect(within(timeline).getAllByText(/^(Ana|Diego)$/)).toHaveLength(2)
    const fetchSpy = vi.spyOn(api, 'getBookingsForPeople')

    const input = screen.getByLabelText('Meeting length (minutes)')
    const t0 = performance.now()
    await user.clear(input)
    await user.type(input, '15')
    await screen.findByText(/of at least 15 minutes/)
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(performance.now() - t0).toBeLessThan(2000) // generous: jsdom + user-event typing
  })
})
