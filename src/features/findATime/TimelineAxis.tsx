import { DAY_END, DAY_START, formatTime, timeSteps } from '../../lib/time'
import { trackStyle } from './timelineScale'

const HOURS = timeSteps(DAY_START, DAY_END, 60)

export function TimelineAxis() {
  return (
    <div className="tl-row tl-axis" aria-hidden="true">
      <div className="tl-label" />
      <div className="tl-track">
        {HOURS.map((m) => (
          <span key={m} className="tl-tick" style={{ left: trackStyle({ start: m, end: m }).left }}>
            {formatTime(m)}
          </span>
        ))}
      </div>
    </div>
  )
}
