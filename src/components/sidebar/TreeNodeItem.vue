<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight, Folder, FolderOpen, Plus, X } from 'lucide-vue-next'
import { useProjectStore } from '@/stores/project'
import type { TreeNode } from '@/stores/tree'
import ChapterRow from './ChapterRow.vue'
import { useInlineRename, vFocusSelect } from './useInlineRename'
import { useTreeDrag } from './useTreeDrag'

const props = defineProps<{
  node: TreeNode
  depth: number
}>()

const projectStore = useProjectStore()
const rename = useInlineRename((id, name) => projectStore.renameFolder(id, name))

const chapter = computed(() =>
  props.node.type === 'chapter'
    ? projectStore.currentProject?.chapters.find(c => c.id === props.node.id) ?? null
    : null
)

const drag = useTreeDrag('tree')

const indent = computed(() => ({ paddingLeft: `calc(0.75rem + ${props.depth}rem)` }))

function addChapterHere() {
  if (props.node.type !== 'folder') return
  if (props.node.collapsed) projectStore.toggleFolder(props.node.id)
  projectStore.addChapter(undefined, props.node.id)
}
</script>

<template>
  <ChapterRow v-if="node.type === 'chapter' && chapter" :chapter="chapter" :depth="depth" in-tree />

  <template v-else-if="node.type === 'folder'">
    <div
      class="tree-row folder-item"
      :class="drag.dropClass(node.id)"
      :style="indent"
      :data-node-id="node.id"
      data-node-type="folder"
      :draggable="rename.editingId.value !== node.id"
      @dragstart="drag.onDragStart($event, node.id)"
      @dragover="drag.onDragOver($event, node.id, 'folder')"
      @dragleave="drag.onDragLeave"
      @drop="drag.onDrop"
      @dragend="drag.onDragEnd"
      @click="projectStore.toggleFolder(node.id)"
      @dblclick.stop="rename.start(node.id, node.name)"
    >
      <ChevronRight :size="14" class="chevron" :class="{ open: !node.collapsed }" />
      <FolderOpen v-if="!node.collapsed" :size="15" class="folder-icon" />
      <Folder v-else :size="15" class="folder-icon" />
      <input
        v-if="rename.editingId.value === node.id"
        v-model="rename.editingValue.value"
        v-focus-select
        class="chapter-edit-input"
        @click.stop
        @dblclick.stop
        @blur="rename.finish"
        @keydown="rename.onKeydown"
      />
      <span v-else class="chapter-title">{{ node.name }}</span>
      <button class="row-btn" @click.stop="addChapterHere" title="이 폴더에 새 챕터">
        <Plus :size="14" />
      </button>
      <button class="delete-btn" @click.stop="projectStore.deleteFolder(node.id)" title="폴더 삭제">
        <X :size="14" />
      </button>
    </div>
    <template v-if="!node.collapsed">
      <TreeNodeItem
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
      />
    </template>
  </template>
</template>
