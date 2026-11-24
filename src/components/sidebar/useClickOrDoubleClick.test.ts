import { test, expect, vi, afterEach } from 'vitest'
import { useClickOrDoubleClick } from './useClickOrDoubleClick'

afterEach(() => { vi.useRealTimers() })

test('single click runs onClick after the delay', () => {
  vi.useFakeTimers()
  const onClick = vi.fn(), onDouble = vi.fn()
  const h = useClickOrDoubleClick(onClick, onDouble, 200)
  h.onClick({ detail: 1 } as MouseEvent)
  expect(onClick).not.toHaveBeenCalled()
  vi.advanceTimersByTime(200)
  expect(onClick).toHaveBeenCalledTimes(1)
  expect(onDouble).not.toHaveBeenCalled()
})

test('double click runs only onDouble (folder is not toggled)', () => {
  vi.useFakeTimers()
  const onClick = vi.fn(), onDouble = vi.fn()
  const h = useClickOrDoubleClick(onClick, onDouble, 200)
  h.onClick({ detail: 1 } as MouseEvent)
  h.onClick({ detail: 2 } as MouseEvent)
  h.onDoubleClick()
  vi.advanceTimersByTime(500)
  expect(onClick).not.toHaveBeenCalled()
  expect(onDouble).toHaveBeenCalledTimes(1)
})
