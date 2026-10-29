# fe-hands-on-set3 — Meeting Room Booking

A small meeting room booking app built with **React + TypeScript (strict)**. Each question lives on its own route and was shipped as its own pull request.

| # | Question     | PR link |
| - | ------------ | ------- |
| 1 | Room Booking | [#1](https://github.com/AnanduKarthi/fe-hands-on-set3/pull/1) |
| 2 | Find a Time  | [#2](https://github.com/AnanduKarthi/fe-hands-on-set3/pull/2) |

## Run it

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Route           | Question          |
| --------------- | ----------------- |
| `/room-booking` | Q1 — Room Booking |
| `/find-a-time`  | Q2 — Find a Time  |

## Test, lint, build

```bash
npm test           # Vitest + React Testing Library (single run)
npm run test:watch # watch mode
npm run lint       # oxlint
npm run build      # type-check (tsc -b) + production build
```

## Stack

| Concern  | Choice                                              |
| -------- | --------------------------------------------------- |
| Build    | Vite                                                |
| UI       | React 19, TypeScript `strict`                       |
| Routing  | React Router (room/date state lives in the URL)     |
| Styling  | Plain CSS with custom properties                    |
| Data     | Hand-written in-memory mock API with latency        |
| Testing  | Vitest, jsdom, React Testing Library, user-event    |
| Linting  | oxlint (React hooks rules, TypeScript, Vitest)      |

No calendar, scheduler or timeline library is used. Scheduling logic is plain typed functions in `src/lib`.

## Project structure

```
src/
  api/            mock backend: types, seed data, createMockApi(), ApiContext
  lib/            pure, typed logic (no React)
    time.ts           minutes <-> "HH:MM", working day 09:00–18:00
    intervals.ts      half-open overlap test
    validateBooking.ts  Q1 form rules
    freeSlots.ts      Q2 common free-slot calculation
  hooks/          useLatestRequest (ignore stale responses), usePolling (visibility-aware)
  features/
    roomBooking/  Q1 page, schedule, booking form
    findATime/    Q2 page, timeline rows, free-slot listbox, booking dialog
```

## Design notes

- **Time model:** times are minutes since midnight and intervals are half-open `[start, end)`. Overlap is `a.start < b.end && b.start < a.end`, so back-to-back meetings never clash.
- **Mock API:** an in-memory store with 300–800 ms latency on every call. Creating a booking fails 10% of the time, and the server re-checks conflicts. Group bookings sometimes lose the slot to "another user". Latency and randomness are injectable, so tests are deterministic.
- **Q1:** the room and date live in the URL. Validation is a pure function, and errors render next to their fields. When the API rejects a booking, the form keeps the user's input. Cancel is optimistic, with rollback.
- **Q2:** `findCommonFreeSlots` clips bookings to the day, sorts and merges them, then keeps the gaps of at least D minutes (O(n log n)). The page memoises the merge on the data, so changing D only re-filters the gaps. Availability polls every 10 s while the tab is visible. Only the latest request's response is applied, and a new selection shows "loading" instead of the old result. Free slots form a keyboard-navigable listbox labelled like "Free 11:00 to 13:00".

## Demo data

Seeded for **today**:

- Rooms Aurora (4 seats), Borealis (8), Cosmos (12) and Atrium (40), with a few bookings.
- **Attendee A** (10:00–11:00, 09:30–10:30) and **Attendee B** (13:00–14:00, 13:15–13:45): the Q2 acceptance example. With D = 30 the common free slots are 09:00–09:30, 11:00–13:00 and 14:00–18:00.
- A **30-person team** with 20 overlapping bookings each, for the responsiveness case. Use the "Whole team (30)" preset.
