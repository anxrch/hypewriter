<script setup lang="ts">
import { useProjectStore } from '@/stores/project'
import TreeNodeItem from './TreeNodeItem.vue'
import { useTreeDrag, ROOT_END_ID } from './useTreeDrag'

const projectStore = useProjectStore()
const drag = useTreeDrag('tree')
</script>

<template>
  <div class="chapters">
    <TreeNodeItem
      v-for="node in projectStore.currentProject?.tree ?? []"
      :key="node.id"
      :node="node"
      :depth="0"
    />
    <!-- 여기에 놓으면 폴더 밖 맨 아래로 -->
    <div
      class="root-drop"
      :class="drag.dropClass(ROOT_END_ID)"
      @dragover="drag.onRootEndDragOver"
      @dragleave="drag.onDragLeave"
      @drop="drag.onDrop"
    />
  </div>
</template>
