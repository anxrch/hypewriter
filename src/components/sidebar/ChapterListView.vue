<script setup lang="ts">
import { useProjectStore } from '@/stores/project'
import ChapterRow from './ChapterRow.vue'

const projectStore = useProjectStore()
</script>

<template>
  <div class="chapters">
    <ChapterRow
      v-for="chapter in projectStore.orderedChapters"
      :key="chapter.id"
      :chapter="chapter"
    />
  </div>
</template>
