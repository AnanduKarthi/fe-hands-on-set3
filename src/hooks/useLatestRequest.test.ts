import { renderHook } from '@testing-library/react'
import { useLatestRequest } from './useLatestRequest'

describe('useLatestRequest', () => {
  it('aborts and invalidates the previous request when a new one starts', () => {
    const { result } = renderHook(() => useLatestRequest())
    const first = result.current()
    expect(first.isLatest()).toBe(true)

    const second = result.current()
    expect(first.signal.aborted).toBe(true)
    expect(first.isLatest()).toBe(false)
    expect(second.isLatest()).toBe(true)
  })

  it('invalidates the in-flight request on unmount', () => {
    const { result, unmount } = renderHook(() => useLatestRequest())
    const ticket = result.current()
    unmount()
    expect(ticket.signal.aborted).toBe(true)
    expect(ticket.isLatest()).toBe(false)
  })
})
