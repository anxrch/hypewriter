<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import { useProjectStore, type Chapter } from '@/stores/project'
import { useInlineRename, vFocusSelect } from './useInlineRename'
import { useTreeDrag } from './useTreeDrag'

const props = withDefaults(defineProps<{
  chapter: Chapter
  depth?: number
  /** 폴더 보기에서는 폴더 화살표 자리만큼 띄워 이름을 맞춘다 */
  inTree?: boolean
}>(), { depth: 0, inTree: false })

const projectStore = useProjectStore()
const rename = useInlineRename((id, title) => projectStore.updateChapter(id, { title }))

const drag = useTreeDrag(props.inTree ? 'tree' : 'list')

const indent = computed(() => ({ paddingLeft: `calc(0.75rem + ${props.depth}rem)` }))
</script>

<template>
  <div
    class="tree-row chapter-item"
    :class="[{ active: chapter.id === projectStore.currentChapterId }, drag.dropClass(chapter.id)]"
    :style="indent"
    :data-node-id="chapter.id"
    data-node-type="chapter"
    :draggable="rename.editingId.value !== chapter.id"
    @dragstart="drag.onDragStart($event, chapter.id)"
    @dragover="drag.onDragOver($event, chapter.id, 'chapter')"
    @dragleave="drag.onDragLeave"
    @drop="drag.onDrop"
    @dragend="drag.onDragEnd"
    @click="projectStore.selectChapter(chapter.id)"
    @dblclick="rename.start(chapter.id, chapter.title)"
  >
    <span v-if="inTree" class="row-spacer" />
    <input
      v-if="rename.editingId.value === chapter.id"
      v-model="rename.editingValue.value"
      v-focus-select
      class="chapter-edit-input"
      @click.stop
      @blur="rename.finish"
      @keydown="rename.onKeydown"
    />
    <span v-else class="chapter-title">{{ chapter.title }}</span>
    <button
      class="delete-btn"
      @click.stop="projectStore.deleteChapter(chapter.id)"
      title="삭제"
    >
      <X :size="14" />
    </button>
  </div>
</template>
