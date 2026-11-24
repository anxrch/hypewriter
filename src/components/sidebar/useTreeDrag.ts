import { ref } from 'vue'
import { useProjectStore } from '@/stores/project'
import { canMove, dropPosition, type DropTarget } from '@/stores/tree'

type DropPos = 'before' | 'after' | 'inside'

// 재귀 트리의 모든 행이 같은 드래그 상태를 봐야 하므로 모듈에서 공유한다.
const draggingId = ref<string | null>(null)
const indicator = ref<{ id: string; pos: DropPos } | null>(null)

/**
 * 드래그 데이터 형식. text/plain을 쓰면 편집기에 떨어뜨렸을 때 id가 본문에 들어간다.
 * (WebKitGTK는 데이터가 하나도 없으면 드래그를 시작하지 않으므로 전용 형식으로 넣는다)
 */
export const TREE_DRAG_MIME = 'application/x-hypewriter-node'

/** 폴더 보기 맨 아래 빈 영역을 가리키는 indicator id */
export const ROOT_END_ID = '__root_end__'

function toTarget(id: string, pos: DropPos): DropTarget {
  if (id === ROOT_END_ID) return { kind: 'root-end' }
  return pos === 'inside' ? { kind: 'inside', folderId: id } : { kind: pos, refId: id }
}

function clear() {
  draggingId.value = null
  indicator.value = null
}

export function useTreeDrag(mode: 'list' | 'tree') {
  const projectStore = useProjectStore()

  function onDragStart(e: DragEvent, id: string) {
    draggingId.value = id
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData(TREE_DRAG_MIME, id)
    }
  }

  function accept(e: DragEvent, id: string, pos: DropPos) {
    const tree = projectStore.currentProject?.tree
    const dragging = draggingId.value
    if (!tree || !dragging || id === dragging || !canMove(tree, dragging, toTarget(id, pos))) {
      indicator.value = null
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'none'
      return
    }
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    indicator.value = { id, pos }
  }

  function onDragOver(e: DragEvent, id: string, type: 'chapter' | 'folder') {
    if (!draggingId.value) return
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const pos = dropPosition(mode === 'list' ? 'chapter' : type, e.clientY - rect.top, rect.height)
    accept(e, id, pos)
  }

  function onRootEndDragOver(e: DragEvent) {
    if (!draggingId.value) return
    accept(e, ROOT_END_ID, 'after')
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    const dragging = draggingId.value
    const ind = indicator.value
    clear()
    if (dragging && ind) projectStore.moveItem(dragging, toTarget(ind.id, ind.pos))
  }

  /** 행에 붙일 드롭 표시 클래스 */
  function dropClass(id: string) {
    return {
      dragging: draggingId.value === id,
      'drop-before': indicator.value?.id === id && indicator.value.pos === 'before',
      'drop-after': indicator.value?.id === id && indicator.value.pos === 'after',
      'drop-inside': indicator.value?.id === id && indicator.value.pos === 'inside'
    }
  }

  return {
    draggingId,
    indicator,
    onDragStart,
    onDragOver,
    onRootEndDragOver,
    onDragLeave(e: DragEvent) {
      // 행 안의 아이콘·글자로 옮겨 갈 때도 dragleave가 오므로 무시한다
      const row = e.currentTarget as HTMLElement | null
      if (row && e.relatedTarget && row.contains(e.relatedTarget as Node)) return
      indicator.value = null
    },
    onDrop,
    onDragEnd: clear,
    dropClass
  }
}
