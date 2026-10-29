import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { ApiContext } from '../../api/ApiContext'
import { createMockApi } from '../../api/mockApi'
import { ApiError, type Booking } from '../../api/types'
import { RoomBookingPage } from './RoomBookingPage'

const DATE = '2026-10-29'

const seed = {
  rooms: [
    { id: 'r1', name: 'Aurora', capacity: 4 },
    { id: 'r2', name: 'Borealis', capacity: 8 },
  ],
  bookings: [
    { id: 'b2', roomId: 'r1', date: DATE, start: 840, end: 870, title: 'Retro', attendees: [] },
    { id: 'b1', roomId: 'r1', date: DATE, start: 600, end: 660, title: 'Design review', attendees: [] },
    { id: 'b3', roomId: 'r2', date: DATE, start: 540, end: 555, title: 'Stand-up', attendees: [] },
  ] satisfies Booking[],
}

function LocationProbe() {
  return <output data-testid="location">{useLocation().search}</output>
}

function setup(url = `/room-booking?room=r1&date=${DATE}`) {
  let roll = 0.5 // >= 0.1 means calls succeed
  const api = createMockApi({ latency: { min: 0, max: 0 }, random: () => roll, seed })
  render(
    <ApiContext.Provider value={api}>
      <MemoryRouter initialEntries={[url]}>
        <RoomBookingPage />
        <LocationProbe />
      </MemoryRouter>
    </ApiContext.Provider>,
  )
  return { api, user: userEvent.setup(), failNextCalls: () => (roll = 0.01) }
}

const schedule = () => screen.findByRole('list', { name: /bookings from 09:00 to 18:00/i })

async function fillForm(user: ReturnType<typeof userEvent.setup>, title: string, start: string) {
  await user.clear(screen.getByLabelText('Title'))
  await user.type(screen.getByLabelText('Title'), title)
  await user.selectOptions(screen.getByLabelText('Start'), start)
}

describe('RoomBookingPage', () => {
  it('shows the room and date from the URL with bookings in time order', async () => {
    setup()
    const items = within(await schedule()).getAllByText(/Design review|Retro/)
    expect(items.map((el) => el.textContent)).toEqual(['Design review', 'Retro'])
    expect(screen.getByLabelText('Room')).toHaveValue('r1')
    expect(screen.getByLabelText('Date')).toHaveValue(DATE)
  })

  it('falls back to the first room when the URL has an unknown room, and writes it to the URL', async () => {
    setup(`/room-booking?room=nope&date=${DATE}`)
    await schedule()
    expect(screen.getByTestId('location')).toHaveTextContent(`?room=r1&date=${DATE}`)
  })

  it('blocks 10:30–11:30 over 10:00–11:00 next to the field, then books 11:00–12:00', async () => {
    const { api, user } = setup()
    const createSpy = vi.spyOn(api, 'createBooking')
    await schedule()

    await fillForm(user, 'Planning', '630') // 10:30, end follows to 11:30
    expect(screen.getByLabelText('End')).toHaveValue('690')
    await user.click(screen.getByRole('button', { name: 'Book room' }))

    const error = await screen.findByText(/Overlaps “Design review” \(10:00–11:00\)/)
    expect(screen.getByLabelText('Start')).toHaveAttribute('aria-describedby', expect.stringContaining(error.id))
    expect(createSpy).not.toHaveBeenCalled()

    await user.selectOptions(screen.getByLabelText('Start'), '660') // 11:00–12:00
    expect(screen.queryByText(/Overlaps/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Book room' }))

    expect(await screen.findByText('Booked “Planning” for 11:00–12:00.')).toBeInTheDocument()
    expect(within(await schedule()).getByText('Planning')).toBeInTheDocument()
  })

  it('keeps what the user typed and shows the reason when the API rejects the booking', async () => {
    const { user, failNextCalls } = setup()
    await schedule()
    await fillForm(user, 'Budget sync', '720')
    await user.type(screen.getByLabelText('Attendee email'), 'ana@example.com{Enter}')

    failNextCalls()
    await user.click(screen.getByRole('button', { name: 'Book room' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/Booking failed: .*unavailable/)
    expect(screen.getByLabelText('Title')).toHaveValue('Budget sync')
    expect(screen.getByLabelText('Start')).toHaveValue('720')
    expect(screen.getByRole('list', { name: 'Added attendees' })).toHaveTextContent('ana@example.com')
  })

  it('shows a conflict when someone else booked the time meanwhile', async () => {
    const { user } = setup()
    await schedule()
    await fillForm(user, 'Planning', '720')
    await user.click(screen.getByRole('button', { name: /simulate someone else/i }))
    await user.click(screen.getByRole('button', { name: 'Book room' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/just booked by someone else/)
    expect(screen.getByLabelText('Title')).toHaveValue('Planning')
  })

  it('adds and removes attendees, rejecting invalid and duplicate emails', async () => {
    const { user } = setup()
    await schedule()
    const input = screen.getByLabelText('Attendee email')

    await user.type(input, 'not-an-email{Enter}')
    expect(screen.getByText(/not a valid email/)).toBeInTheDocument()

    await user.clear(input)
    await user.type(input, 'ana@example.com{Enter}')
    await user.type(input, 'ANA@example.com{Enter}')
    expect(screen.getByText(/already added/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove ana@example.com' }))
    expect(screen.queryByRole('list', { name: 'Added attendees' })).not.toBeInTheDocument()
  })

  it('removes a cancelled booking immediately and restores it if the API fails', async () => {
    const { api, user } = setup()
    let rejectCancel!: (error: Error) => void
    vi.spyOn(api, 'cancelBooking').mockImplementation(
      () => new Promise<void>((_, reject) => (rejectCancel = reject)),
    )
    await schedule()

    await user.click(screen.getByRole('button', { name: 'Cancel Design review 10:00–11:00' }))
    await user.click(screen.getByRole('button', { name: 'Yes, cancel' }))
    expect(within(await schedule()).queryByText('Design review')).not.toBeInTheDocument()

    rejectCancel(new ApiError('server', 'Network down'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not cancel “Design review”: Network down')
    expect(within(await schedule()).getByText('Design review')).toBeInTheDocument()
  })

  it('does not cancel when the confirmation is dismissed', async () => {
    const { api, user } = setup()
    const cancelSpy = vi.spyOn(api, 'cancelBooking')
    await schedule()
    await user.click(screen.getByRole('button', { name: 'Cancel Retro 14:00–14:30' }))
    await user.click(screen.getByRole('button', { name: 'Keep' }))
    expect(cancelSpy).not.toHaveBeenCalled()
    await waitFor(() => expect(within(screen.getByRole('list', { name: /bookings/i })).getByText('Retro')).toBeInTheDocument())
  })
})

