import { memo, useRef, useState, type KeyboardEvent } from 'react'
import type { Interval } from '../../api/types'
import { formatRange } from '../../lib/time'
import { slotLabel, trackStyle } from './timelineScale'

interface Props {
  slots: Interval[]
  durationMinutes: number
  onSelect: (slot: Interval) => void
}

/**
 * The common free slots as a horizontal listbox with a roving tabindex: Tab
 * enters on the active slot, the arrow keys / Home / End move between slots,
 * and Enter (or Space, or a click) books the selected one.
 */
export const FreeSlotsRow = memo(function FreeSlotsRow({ slots, durationMinutes, onSelect }: Props) {
  // Track the active slot by its start time so it survives a refresh that recomputes the slots.
  const [activeStart, setActiveStart] = useState<number>()
  const optionRefs = useRef(new Map<number, HTMLDivElement>())
  const activeIndex = Math.max(
    0,
    slots.findIndex((s) => s.start === activeStart),
  )

  function moveTo(index: number) {
    const slot = slots[index]
    setActiveStart(slot.start)
    optionRefs.current.get(slot.start)?.focus()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>, index: number) {
    const last = slots.length - 1
    const target: Record<string, number> = {
      ArrowRight: Math.min(index + 1, last),
      ArrowDown: Math.min(index + 1, last),
      ArrowLeft: Math.max(index - 1, 0),
      ArrowUp: Math.max(index - 1, 0),
      Home: 0,
      End: last,
    }
    if (e.key in target) {
      e.preventDefault()
      moveTo(target[e.key])
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect(slots[index])
    }
  }

  return (
    <div className="tl-row tl-free-row">
      <div className="tl-label" id="free-slots-label">
        Common free
        <span className="muted tl-sublabel">≥ {durationMinutes} min</span>
      </div>
      {slots.length === 0 ? (
        <div className="tl-track tl-empty">No common free slot of {durationMinutes} minutes or more.</div>
      ) : (
        <div
          className="tl-track"
          role="listbox"
          aria-labelledby="free-slots-label"
          aria-orientation="horizontal"
        >
          {slots.map((slot, index) => (
            <div
              key={slot.start}
              ref={(el) => {
                if (el) optionRefs.current.set(slot.start, el)
                return () => {
                  optionRefs.current.delete(slot.start)
                }
              }}
              role="option"
              aria-selected={index === activeIndex}
              aria-label={slotLabel(slot)}
              tabIndex={index === activeIndex ? 0 : -1}
              className="tl-free"
              style={trackStyle(slot)}
              title={`${slotLabel(slot)}. Press Enter to book.`}
              onFocus={() => setActiveStart(slot.start)}
              onClick={() => {
                setActiveStart(slot.start)
                onSelect(slot)
              }}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              <span className="tl-free-text" aria-hidden="true">
                {formatRange(slot)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})
