import { NavLink, Route, Routes } from 'react-router-dom'
import { HomePage } from './features/home/HomePage'
import { RoomBookingPage } from './features/roomBooking/RoomBookingPage'
import { FindATimePage } from './features/findATime/FindATimePage'

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <span className="brand">Meeting Rooms</span>
        <nav aria-label="Main">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/room-booking">Q1 · Room Booking</NavLink>
          <NavLink to="/find-a-time">Q2 · Find a Time</NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/room-booking" element={<RoomBookingPage />} />
          <Route path="/find-a-time" element={<FindATimePage />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </div>
  )
}
