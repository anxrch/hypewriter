import { ref } from 'vue'

// 사이드바 전체에서 동시에 하나만 편집하므로 상태를 모듈에서 공유한다.
// (새 폴더를 만들자마자 그 폴더 행이 편집 상태로 들어가야 하기 때문)
const editingId = ref<string | null>(null)
const editingValue = ref('')

export function startRename(id: string, value: string) {
  editingId.value = id
  editingValue.value = value
}

export function useInlineRename(onCommit: (id: string, value: string) => void) {
  /** blur/Enter 이벤트를 넘기면 입력창의 실제 값을 쓴다 (한글 조합 중이면 v-model이 늦다) */
  function finish(e?: Event) {
    const id = editingId.value
    const input = e?.target as HTMLInputElement | undefined
    const value = (typeof input?.value === 'string' ? input.value : editingValue.value).trim()
    editingId.value = null
    editingValue.value = ''
    if (id && value) onCommit(id, value)
  }

  function cancel() {
    editingId.value = null
    editingValue.value = ''
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.isComposing || e.keyCode === 229) return // 한글 조합 중 Enter는 무시
    if (e.key === 'Enter') finish(e)
    else if (e.key === 'Escape') cancel()
  }

  return { editingId, editingValue, start: startRename, finish, cancel, onKeydown }
}

/** 마운트되면 포커스하고 전체 선택 */
export const vFocusSelect = {
  mounted(el: HTMLInputElement) {
    el.focus()
    el.select()
  }
}
