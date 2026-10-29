import { renderHook } from '@testing-library/react'
import { usePolling } from './usePolling'

let visibility: DocumentVisibilityState = 'visible'

function setVisibility(value: DocumentVisibilityState) {
  visibility = value
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeAll(() => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibility })
})

beforeEach(() => {
  visibility = 'visible'
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('usePolling', () => {
  it('calls back every interval while the tab is visible', () => {
    const callback = vi.fn<() => void>()
    renderHook(() => usePolling(callback, 10_000))
    vi.advanceTimersByTime(9_999)
    expect(callback).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(callback).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(20_000)
    expect(callback).toHaveBeenCalledTimes(3)
  })

  it('pauses while hidden and refreshes immediately when visible again', () => {
    const callback = vi.fn<() => void>()
    renderHook(() => usePolling(callback, 10_000))

    setVisibility('hidden')
    vi.advanceTimersByTime(60_000)
    expect(callback).not.toHaveBeenCalled()

    setVisibility('visible')
    expect(callback).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(10_000)
    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('does not start while the tab is hidden', () => {
    visibility = 'hidden'
    const callback = vi.fn<() => void>()
    renderHook(() => usePolling(callback, 10_000))
    vi.advanceTimersByTime(30_000)
    expect(callback).not.toHaveBeenCalled()
  })

  it('stops on unmount and when disabled', () => {
    const callback = vi.fn<() => void>()
    const { rerender, unmount } = renderHook(({ enabled }) => usePolling(callback, 10_000, enabled), {
      initialProps: { enabled: true },
    })
    rerender({ enabled: false })
    vi.advanceTimersByTime(30_000)
    expect(callback).not.toHaveBeenCalled()
    rerender({ enabled: true })
    unmount()
    vi.advanceTimersByTime(30_000)
    expect(callback).not.toHaveBeenCalled()
  })

  it('always uses the latest callback without restarting the timer', () => {
    const first = vi.fn<() => void>()
    const second = vi.fn<() => void>()
    const { rerender } = renderHook(({ cb }) => usePolling(cb, 10_000), { initialProps: { cb: first } })
    vi.advanceTimersByTime(5_000)
    rerender({ cb: second })
    vi.advanceTimersByTime(5_000)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })
})
