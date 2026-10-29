import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <section>
      <h1>Meeting room booking</h1>
      <ul>
        <li>
          <Link to="/room-booking">Q1 — Room Booking</Link>: see a room&apos;s day and book or cancel
          meetings.
        </li>
        <li>
          <Link to="/find-a-time">Q2 — Find a Time</Link>: find common free slots for a group and book
          one.
        </li>
      </ul>
    </section>
  )
}
