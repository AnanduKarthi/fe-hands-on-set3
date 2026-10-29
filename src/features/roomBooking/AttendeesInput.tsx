import type { KeyboardEvent } from 'react'
import { FieldError } from './FieldError'

interface Props {
  attendees: string[]
  pending: string
  /** Error for the email being typed (invalid, duplicate, not added yet). */
  inputError?: string
  /** Error for the list as a whole, from validateBooking. */
  listError?: string
  disabled?: boolean
  onPendingChange: (value: string) => void
  onAdd: () => void
  onRemove: (email: string) => void
}

export function AttendeesInput({
  attendees,
  pending,
  inputError,
  listError,
  disabled,
  onPendingChange,
  onAdd,
  onRemove,
}: Props) {
  const error = inputError ?? listError

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault() // add the email instead of submitting the form
      onAdd()
    }
  }

  return (
    <fieldset className="attendees" disabled={disabled}>
      <legend>Attendees</legend>
      <div className="attendee-entry">
        <label htmlFor="booking-attendee" className="visually-hidden">
          Attendee email
        </label>
        <input
          id="booking-attendee"
          type="email"
          placeholder="name@example.com"
          value={pending}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'booking-attendees-error' : undefined}
          onChange={(e) => onPendingChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button type="button" onClick={onAdd}>
          Add
        </button>
      </div>
      <FieldError id="booking-attendees-error" message={error} />
      {attendees.length > 0 && (
        <ul className="chips" aria-label="Added attendees">
          {attendees.map((email) => (
            <li key={email} className="chip">
              {email}
              <button type="button" aria-label={`Remove ${email}`} onClick={() => onRemove(email)}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  )
}
