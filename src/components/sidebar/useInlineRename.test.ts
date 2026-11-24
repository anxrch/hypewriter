import { test, expect, vi } from 'vitest'
import { useInlineRename } from './useInlineRename'

test('finish commits the input element value (IME text not yet in v-model)', () => {
  const onCommit = vi.fn()
  const r = useInlineRename(onCommit)
  r.start('f1', '새 폴더')
  r.editingValue.value = '1ㅂ'          // v-model lags during composition
  r.finish({ target: { value: '1부' } } as unknown as Event)
  expect(onCommit).toHaveBeenCalledWith('f1', '1부')
  expect(r.editingId.value).toBeNull()
})

test('finish without event falls back to editingValue', () => {
  const onCommit = vi.fn()
  const r = useInlineRename(onCommit)
  r.start('f1', 'a')
  r.editingValue.value = 'b'
  r.finish()
  expect(onCommit).toHaveBeenCalledWith('f1', 'b')
})

test('Enter during composition (keyCode 229) does not commit', () => {
  const onCommit = vi.fn()
  const r = useInlineRename(onCommit)
  r.start('f1', 'a')
  r.onKeydown({ key: 'Enter', isComposing: false, keyCode: 229 } as KeyboardEvent)
  expect(onCommit).not.toHaveBeenCalled()
  expect(r.editingId.value).toBe('f1')
})

test('cancelRename clears a pending rename from outside', async () => {
  const { cancelRename, startRename } = await import('./useInlineRename')
  const onCommit = vi.fn()
  const r = useInlineRename(onCommit)
  startRename('f1', 'a')
  cancelRename()
  expect(r.editingId.value).toBeNull()
  r.finish()
  expect(onCommit).not.toHaveBeenCalled()
})
