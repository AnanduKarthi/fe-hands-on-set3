import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

describe('App routing', () => {
  it('renders each question on its own route', () => {
    render(
      <MemoryRouter initialEntries={['/room-booking']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Room Booking' })).toBeInTheDocument()
  })
})
