import { test, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTreeDrag, TREE_DRAG_MIME } from './useTreeDrag'

function fakeDataTransfer() {
  const data = new Map<string, string>()
  return {
    data,
    effectAllowed: '',
    dropEffect: '',
    setData: (type: string, v: string) => { data.set(type, v) },
    getData: (type: string) => data.get(type) ?? ''
  }
}

beforeEach(() => setActivePinia(createPinia()))

test('drag payload uses a private MIME type, never text/plain (editor would insert it)', () => {
  const drag = useTreeDrag('tree')
  const dt = fakeDataTransfer()
  drag.onDragStart({ dataTransfer: dt } as unknown as DragEvent, 'abc')
  expect(dt.data.get(TREE_DRAG_MIME)).toBe('abc')
  expect(dt.data.has('text/plain')).toBe(false)
  expect(dt.data.has('text/html')).toBe(false)
  drag.onDragEnd()
})

test('dragleave into a child element keeps the drop indicator', () => {
  const drag = useTreeDrag('tree')
  drag.indicator.value = { id: 'x', pos: 'before' }
  const child = {}
  const row = { contains: (n: unknown) => n === child }
  drag.onDragLeave({ currentTarget: row, relatedTarget: child } as unknown as DragEvent)
  expect(drag.indicator.value).toEqual({ id: 'x', pos: 'before' })
  drag.onDragLeave({ currentTarget: row, relatedTarget: null } as unknown as DragEvent)
  expect(drag.indicator.value).toBeNull()
})
