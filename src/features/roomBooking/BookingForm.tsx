import { useState, type FormEvent } from 'react'
import { errorMessage, type Booking, type Interval } from '../../api/types'
import { DAY_END, DAY_START, STEP_MINUTES, formatTime, timeSteps } from '../../lib/time'
import {
  emailError,
  hasErrors,
  normalizeEmail,
  validateBooking,
  type BookingDraft,
  type BookingField,
} from '../../lib/validateBooking'
import { AttendeesInput } from './AttendeesInput'
import { FieldError } from './FieldError'

const START_OPTIONS = timeSteps(DAY_START, DAY_END - STEP_MINUTES)
const END_OPTIONS = timeSteps(DAY_START + STEP_MINUTES, DAY_END)
const EMPTY_DRAFT: BookingDraft = { title: '', start: DAY_START, end: DAY_START + 60, attendees: [] }

/** Element to focus for each field when it has an error. */
const FIELD_INPUT_ID: Record<BookingField, string> = {
  title: 'booking-title',
  start: 'booking-start',
  end: 'booking-end',
  time: 'booking-start',
  attendees: 'booking-attendee',
}

interface Props {
  /** The room's bookings for the selected day, used for the overlap check. */
  existing: Booking[]
  disabled?: boolean
  /** Sends the booking. Rejects with the API's reason if it fails. */
  onSubmit: (draft: BookingDraft) => Promise<void>
  /** Dev helper to reproduce "someone else booked the room meanwhile". */
  onSimulateConflict?: (range: Interval) => void
}

export function BookingForm({ existing, disabled, onSubmit, onSimulateConflict }: Props) {
  const [draft, setDraft] = useState<BookingDraft>(EMPTY_DRAFT)
  const [pendingEmail, setPendingEmail] = useState('')
  const [emailInputError, setEmailInputError] = useState<string>()
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string>()

  // Derived, not stored: after the first submit attempt, errors update as the user types.
  const errors = showErrors ? validateBooking(draft, existing) : {}

  function update(patch: Partial<BookingDraft>) {
    setDraft((d) => ({ ...d, ...patch }))
  }

  function changeStart(start: number) {
    // Keep the meeting length when moving the start, like most calendars do.
    setDraft((d) => ({ ...d, start, end: Math.min(start + (d.end - d.start), DAY_END) }))
  }

  function addEmail() {
    const error = emailError(pendingEmail, draft.attendees)
    setEmailInputError(error)
    if (error) return
    update({ attendees: [...draft.attendees, normalizeEmail(pendingEmail)] })
    setPendingEmail('')
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return
    setShowErrors(true)
    setApiError(undefined)

    if (pendingEmail.trim()) {
      setEmailInputError('Add this email or clear it before booking')
      document.getElementById(FIELD_INPUT_ID.attendees)?.focus()
      return
    }
    const found = validateBooking(draft, existing)
    if (hasErrors(found)) {
      const first = (Object.keys(FIELD_INPUT_ID) as BookingField[]).find((f) => found[f])
      if (first) document.getElementById(FIELD_INPUT_ID[first])?.focus()
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({ ...draft, title: draft.title.trim() })
      setDraft(EMPTY_DRAFT)
      setShowErrors(false)
    } catch (error) {
      // Keep everything the user typed so they can adjust and retry.
      setApiError(errorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const describedBy = (field: BookingField) => (errors[field] ? `booking-${field}-error` : undefined)
  const timeError = errors.time

  return (
    <form className="booking-form" noValidate onSubmit={handleSubmit} aria-label="New booking">
      <h2>New booking</h2>

      {apiError && (
        <p className="banner error" role="alert">
          Booking failed: {apiError}
        </p>
      )}

      <div className="field">
        <label htmlFor="booking-title">Title</label>
        <input
          id="booking-title"
          value={draft.title}
          disabled={disabled}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={describedBy('title')}
          onChange={(e) => update({ title: e.target.value })}
        />
        <FieldError id="booking-title-error" message={errors.title} />
      </div>

      <div className="time-row">
        <div className="field">
          <label htmlFor="booking-start">Start</label>
          <select
            id="booking-start"
            value={draft.start}
            disabled={disabled}
            aria-invalid={errors.start || timeError ? true : undefined}
            aria-describedby={[describedBy('start'), describedBy('time')].filter(Boolean).join(' ') || undefined}
            onChange={(e) => changeStart(Number(e.target.value))}
          >
            {START_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {formatTime(m)}
              </option>
            ))}
          </select>
          <FieldError id="booking-start-error" message={errors.start} />
        </div>
        <div className="field">
          <label htmlFor="booking-end">End</label>
          <select
            id="booking-end"
            value={draft.end}
            disabled={disabled}
            aria-invalid={errors.end || timeError ? true : undefined}
            aria-describedby={[describedBy('end'), describedBy('time')].filter(Boolean).join(' ') || undefined}
            onChange={(e) => update({ end: Number(e.target.value) })}
          >
            {END_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {formatTime(m)}
              </option>
            ))}
          </select>
          <FieldError id="booking-end-error" message={errors.end} />
        </div>
      </div>
      <FieldError id="booking-time-error" message={timeError} />

      <AttendeesInput
        attendees={draft.attendees}
        pending={pendingEmail}
        inputError={emailInputError}
        listError={errors.attendees}
        disabled={disabled}
        onPendingChange={(value) => {
          setPendingEmail(value)
          setEmailInputError(undefined)
        }}
        onAdd={addEmail}
        onRemove={(email) => update({ attendees: draft.attendees.filter((a) => a !== email) })}
      />

      <div className="form-actions">
        <button type="submit" className="primary" disabled={disabled || submitting}>
          {submitting ? 'Booking…' : 'Book room'}
        </button>
        {onSimulateConflict && (
          <button
            type="button"
            className="link-button"
            disabled={disabled || submitting}
            title="Books this time from 'another user' without refreshing your view"
            onClick={() => onSimulateConflict({ start: draft.start, end: draft.end })}
          >
            Simulate someone else booking this time
          </button>
        )}
      </div>
    </form>
  )
}
