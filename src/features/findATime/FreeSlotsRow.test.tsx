import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Interval } from '../../api/types'
import { FreeSlotsRow } from './FreeSlotsRow'

const slots: Interval[] = [
  { start: 540, end: 570 },
  { start: 660, end: 780 },
  { start: 840, end: 1080 },
]

function setup() {
  const onSelect = vi.fn<(slot: Interval) => void>()
  render(<FreeSlotsRow slots={slots} durationMinutes={30} onSelect={onSelect} />)
  return { onSelect, user: userEvent.setup() }
}

describe('FreeSlotsRow', () => {
  it('labels each slot for screen readers', () => {
    setup()
    const options = screen.getAllByRole('option')
    expect(options.map((o) => o.getAttribute('aria-label'))).toEqual([
      'Free 09:00 to 09:30',
      'Free 11:00 to 13:00',
      'Free 14:00 to 18:00',
    ])
    expect(screen.getByRole('listbox', { name: /common free/i })).toBeInTheDocument()
  })

  it('is a single tab stop, and the arrow keys move between slots', async () => {
    const { user } = setup()
    await user.tab()
    expect(screen.getByRole('option', { name: 'Free 09:00 to 09:30' })).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('option', { name: 'Free 11:00 to 13:00' })).toHaveFocus()
    expect(screen.getByRole('option', { name: 'Free 11:00 to 13:00' })).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{End}')
    expect(screen.getByRole('option', { name: 'Free 14:00 to 18:00' })).toHaveFocus()
    await user.keyboard('{ArrowRight}') // stays on the last slot
    expect(screen.getByRole('option', { name: 'Free 14:00 to 18:00' })).toHaveFocus()

    await user.keyboard('{ArrowLeft}{Home}')
    expect(screen.getByRole('option', { name: 'Free 09:00 to 09:30' })).toHaveFocus()
  })

  it('books the selected slot with Enter', async () => {
    const { user, onSelect } = setup()
    await user.tab()
    await user.keyboard('{ArrowRight}{Enter}')
    expect(onSelect).toHaveBeenCalledWith({ start: 660, end: 780 })
  })

  it('shows a message when there is no free slot', () => {
    render(<FreeSlotsRow slots={[]} durationMinutes={60} onSelect={() => {}} />)
    expect(screen.getByText('No common free slot of 60 minutes or more.')).toBeInTheDocument()
  })
})
