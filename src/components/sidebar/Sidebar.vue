<script setup lang="ts">
import { watch } from 'vue'
import { useProjectStore } from '@/stores/project'
import { useSettingsStore } from '@/stores/settings'
import {
  Moon,
  Sun,
  Plus,
  Save,
  FolderOpen,
  FilePlus,
  FolderPlus,
  FolderTree,
  List
} from 'lucide-vue-next'
import ChapterListView from './ChapterListView.vue'
import FolderTreeView from './FolderTreeView.vue'
import { startRename, cancelRename } from './useInlineRename'

const projectStore = useProjectStore()
const settingsStore = useSettingsStore()

// 보기를 바꾸면 진행 중이던 이름 편집은 버린다 (안 보이는 행에 편집 상태가 남지 않게)
watch(() => settingsStore.sidebarView, cancelRename)

function newFolder() {
  const name = '새 폴더'
  const id = projectStore.addFolder(name)
  startRename(id, name)
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
        <div class="section-actions">
          <button
            class="add-btn"
            @click="settingsStore.toggleSidebarView"
            :title="settingsStore.sidebarView === 'tree' ? '목록 보기' : '폴더 보기'"
          >
            <List v-if="settingsStore.sidebarView === 'tree'" :size="16" />
            <FolderTree v-else :size="16" />
          </button>
          <button
            v-if="settingsStore.sidebarView === 'tree'"
            class="add-btn"
            @click="newFolder"
            title="새 폴더"
          >
            <FolderPlus :size="16" />
          </button>
          <button class="add-btn" @click="projectStore.addChapter()" title="새 챕터">
            <Plus :size="16" />
          </button>
        </div>
      </div>

      <FolderTreeView v-if="settingsStore.sidebarView === 'tree'" />
      <ChapterListView v-else />
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

.section-actions {
  display: flex;
  gap: 2px;
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

<!-- 행 스타일은 하위 컴포넌트(ChapterRow, TreeNodeItem)에도 적용되도록 scoped 밖에 둔다 -->
<style>
.sidebar .chapters {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar .tree-row {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
}

.sidebar .tree-row:hover {
  background: var(--border-color);
}

.sidebar .chapter-item.active {
  background: var(--accent-color);
  color: white;
}

.sidebar .chapter-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9rem;
}

.sidebar .chapter-edit-input {
  flex: 1;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.sidebar .chapter-edit-input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.sidebar .delete-btn {
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

.sidebar .chapter-item:hover .delete-btn {
  opacity: 1;
}

.sidebar .delete-btn:hover {
  background: rgba(255, 59, 48, 0.2);
  color: #ff3b30;
}

.sidebar .chapter-item.active .delete-btn {
  color: rgba(255, 255, 255, 0.7);
}

.sidebar .chapter-item.active .delete-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.sidebar .row-spacer {
  width: 14px;
  flex-shrink: 0;
  margin-right: 0.35rem;
}

.sidebar .folder-item {
  color: var(--text-secondary);
}

.sidebar .chevron {
  flex-shrink: 0;
  margin-right: 0.35rem;
  color: var(--text-muted);
  transition: transform 0.15s;
}

.sidebar .chevron.open {
  transform: rotate(90deg);
}

.sidebar .folder-icon {
  flex-shrink: 0;
  margin-right: 0.4rem;
  color: var(--text-muted);
}

.sidebar .row-btn {
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

.sidebar .folder-item:hover .row-btn {
  opacity: 1;
}

.sidebar .row-btn:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.sidebar .folder-item:hover .delete-btn {
  opacity: 1;
}

.sidebar .tree-row.dragging {
  opacity: 0.4;
}

.sidebar .tree-row.drop-before {
  box-shadow: inset 0 2px 0 var(--accent-color);
}

.sidebar .tree-row.drop-after {
  box-shadow: inset 0 -2px 0 var(--accent-color);
}

.sidebar .tree-row.drop-inside {
  outline: 1px solid var(--accent-color);
  outline-offset: -1px;
  background: var(--border-color);
}

.sidebar .root-drop {
  min-height: 2.5rem;
  border-radius: 6px;
}

.sidebar .root-drop.drop-after {
  box-shadow: inset 0 2px 0 var(--accent-color);
}
</style>
