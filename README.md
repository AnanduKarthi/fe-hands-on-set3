# fe-hands-on-set3 — Meeting Room Booking

A small meeting room booking app built with **React + TypeScript (strict)**. Each question lives on its own route and was shipped as its own pull request.

| # | Question     | PR link |
| - | ------------ | ------- |
| 1 | Room Booking | [#1](https://github.com/AnanduKarthi/fe-hands-on-set3/pull/1) |
| 2 | Find a Time  | _pending_ |

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
