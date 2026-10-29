import { useState } from 'react'
import type { Person } from '../../api/types'
import { PERSON_A, PERSON_B, TEAM } from '../../api/seed'

interface Props {
  people: Person[]
  selected: string[]
  onChange: (emails: string[]) => void
}

const PRESETS = [
  { label: 'A + B (example)', emails: [PERSON_A.email, PERSON_B.email] },
  { label: `Whole team (${TEAM.length})`, emails: TEAM.map((p) => p.email) },
]

export function AttendeePicker({ people, selected, onChange }: Props) {
  const [filter, setFilter] = useState('')
  const selectedSet = new Set(selected)
  const query = filter.trim().toLowerCase()
  const visible = query
    ? people.filter((p) => p.name.toLowerCase().includes(query) || p.email.includes(query))
    : people

  // Keep the selection in the people list's order, so the same group always has the same key.
  function commit(next: Set<string>) {
    onChange(people.filter((p) => next.has(p.email)).map((p) => p.email))
  }

  function toggle(email: string) {
    const next = new Set(selectedSet)
    if (next.has(email)) next.delete(email)
    else next.add(email)
    commit(next)
  }

  return (
    <fieldset className="attendee-picker">
      <legend>
        Attendees <span className="muted">({selected.length} selected)</span>
      </legend>
      <div className="picker-presets">
        {PRESETS.map((preset) => (
          <button key={preset.label} type="button" onClick={() => commit(new Set(preset.emails))}>
            {preset.label}
          </button>
        ))}
        <button type="button" onClick={() => commit(new Set())} disabled={selected.length === 0}>
          Clear
        </button>
      </div>
      <label className="visually-hidden" htmlFor="attendee-filter">
        Filter people
      </label>
      <input
        id="attendee-filter"
        type="search"
        placeholder="Filter people…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <ul className="picker-list">
        {visible.map((person) => (
          <li key={person.email}>
            <label>
              <input
                type="checkbox"
                checked={selectedSet.has(person.email)}
                onChange={() => toggle(person.email)}
              />
              {person.name} <span className="muted">{person.email}</span>
            </label>
          </li>
        ))}
        {visible.length === 0 && <li className="muted">No one matches “{filter}”.</li>}
      </ul>
    </fieldset>
  )
}
