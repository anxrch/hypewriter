<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Sidebar from './components/sidebar/Sidebar.vue'
import Editor from './components/editor/Editor.vue'
import { useProjectStore } from './stores/project'
import { useSettingsStore } from './stores/settings'

const projectStore = useProjectStore()
const settingsStore = useSettingsStore()

const sidebarWidth = ref(260)
const isResizing = ref(false)

onMounted(() => {
  // Apply saved theme
  document.documentElement.setAttribute('data-theme', settingsStore.theme)
})

function startResize() {
  isResizing.value = true
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
}

function handleResize(e: MouseEvent) {
  if (!isResizing.value) return
  const newWidth = Math.max(200, Math.min(400, e.clientX))
  sidebarWidth.value = newWidth
}

function stopResize() {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}
</script>

<template>
  <div class="app-container">
    <Sidebar 
      :style="{ width: `${sidebarWidth}px` }"
      class="sidebar"
    />
    <div 
      class="resize-handle"
      @mousedown="startResize"
    />
    <main class="main-content">
      <Editor v-if="projectStore.currentChapter" />
      <div v-else class="welcome">
        <div class="welcome-content">
          <h1>Hypewriter</h1>
          <p>작가를 위한 글쓰기 도구</p>
          <div class="welcome-actions">
            <button @click="projectStore.createProject" class="btn-primary">
              새 프로젝트 만들기
            </button>
            <button @click="projectStore.openProject" class="btn-secondary">
              프로젝트 열기
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.sidebar {
  flex-shrink: 0;
  height: 100%;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border-color);
}

.resize-handle {
  width: 4px;
  cursor: col-resize;
  background: transparent;
  transition: background 0.2s;
}

.resize-handle:hover {
  background: var(--accent-color);
}

.main-content {
  flex: 1;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.welcome {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
}

.welcome-content {
  text-align: center;
}

.welcome-content h1 {
  font-size: 2.5rem;
  font-weight: 300;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.welcome-content p {
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;
}

.welcome-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn-primary,
.btn-secondary {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-size: 0.95rem;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--accent-color);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--border-color);
}
</style>
