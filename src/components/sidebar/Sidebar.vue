<script setup lang="ts">
import { ref } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useSettingsStore } from '@/stores/settings'
import { 
  Moon, 
  Sun, 
  Plus, 
  X, 
  Save, 
  FolderOpen, 
  FilePlus 
} from 'lucide-vue-next'

const projectStore = useProjectStore()
const settingsStore = useSettingsStore()

const editingChapterId = ref<string | null>(null)
const editingTitle = ref('')

function startEdit(chapterId: string, currentTitle: string) {
  editingChapterId.value = chapterId
  editingTitle.value = currentTitle
}

function finishEdit() {
  if (editingChapterId.value && editingTitle.value.trim()) {
    projectStore.updateChapter(editingChapterId.value, { title: editingTitle.value.trim() })
  }
  editingChapterId.value = null
  editingTitle.value = ''
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    finishEdit()
  } else if (e.key === 'Escape') {
    editingChapterId.value = null
    editingTitle.value = ''
  }
}
</script>

<template>
  <div class="sidebar">
    <!-- Header -->
    <div class="sidebar-header">
      <div class="project-title" v-if="projectStore.currentProject">
        {{ projectStore.currentProject.metadata.title }}
      </div>
      <div class="project-title" v-else>
        Hypewriter
      </div>
      <button 
        class="theme-toggle" 
        @click="settingsStore.toggleTheme"
        :title="settingsStore.theme === 'light' ? '다크 모드' : '라이트 모드'"
      >
        <Moon v-if="settingsStore.theme === 'light'" :size="18" />
        <Sun v-else :size="18" />
      </button>
    </div>

    <!-- Chapter List -->
    <div class="chapter-list" v-if="projectStore.currentProject">
      <div class="section-header">
        <span>챕터</span>
        <button class="add-btn" @click="projectStore.addChapter()" title="새 챕터">
          <Plus :size="16" />
        </button>
      </div>

      <div class="chapters">
        <div
          v-for="chapter in projectStore.currentProject.chapters"
          :key="chapter.id"
          class="chapter-item"
          :class="{ active: chapter.id === projectStore.currentChapterId }"
          @click="projectStore.selectChapter(chapter.id)"
          @dblclick="startEdit(chapter.id, chapter.title)"
        >
          <input
            v-if="editingChapterId === chapter.id"
            v-model="editingTitle"
            class="chapter-edit-input"
            @blur="finishEdit"
            @keydown="handleKeydown"
            ref="editInput"
            autofocus
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
      </div>
    </div>

    <!-- Bottom Actions -->
    <div class="sidebar-footer">
      <button 
        v-if="projectStore.currentProject"
        class="footer-btn"
        @click="projectStore.saveProject"
        :class="{ dirty: projectStore.isDirty }"
      >
        <Save :size="16" />
        <span>저장</span>
      </button>
      <button class="footer-btn" @click="projectStore.openProject">
        <FolderOpen :size="16" />
        <span>열기</span>
      </button>
      <button class="footer-btn" @click="projectStore.createProject">
        <FilePlus :size="16" />
        <span>새로 만들기</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  user-select: none;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.project-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.theme-toggle {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.theme-toggle:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.chapter-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.5px;
}

.add-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: all 0.2s;
}

.add-btn:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.chapters {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.chapter-item {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
}

.chapter-item:hover {
  background: var(--border-color);
}

.chapter-item.active {
  background: var(--accent-color);
  color: white;
}

.chapter-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9rem;
}

.chapter-edit-input {
  flex: 1;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: var(--bg-primary);
  font-size: 0.9rem;
}

.delete-btn {
  opacity: 0;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: all 0.15s;
}

.chapter-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: rgba(255, 59, 48, 0.2);
  color: #ff3b30;
}

.chapter-item.active .delete-btn {
  color: rgba(255, 255, 255, 0.7);
}

.chapter-item.active .delete-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.sidebar-footer {
  padding: 0.75rem;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.footer-btn {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  text-align: left;
  color: var(--text-secondary);
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.footer-btn:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.footer-btn.dirty {
  color: var(--accent-color);
  font-weight: 500;
}
</style>
