<script setup lang="ts">
import { ref } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { useSettingsStore } from '@/stores/settings'
import FontSelector from './FontSelector.vue'
import ExportModal from './ExportModal.vue'

const props = defineProps<{
  editor: Editor | undefined
}>()

const emit = defineEmits<{
  (e: 'toggle-footnotes'): void
}>()

const settingsStore = useSettingsStore()
const showFontSelector = ref(false)
const showExportModal = ref(false)

function isActive(name: string, attrs?: object): boolean {
  return props.editor?.isActive(name, attrs) ?? false
}
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-group">
      <!-- Text formatting -->
      <button
        class="toolbar-btn"
        :class="{ active: isActive('bold') }"
        @click="editor?.chain().focus().toggleBold().run()"
        title="굵게 (Ctrl+B)"
      >
        <strong>B</strong>
      </button>
      <button
        class="toolbar-btn"
        :class="{ active: isActive('italic') }"
        @click="editor?.chain().focus().toggleItalic().run()"
        title="기울임 (Ctrl+I)"
      >
        <em>I</em>
      </button>
      <button
        class="toolbar-btn"
        :class="{ active: isActive('underline') }"
        @click="editor?.chain().focus().toggleUnderline().run()"
        title="밑줄 (Ctrl+U)"
      >
        <u>U</u>
      </button>
      <button
        class="toolbar-btn"
        :class="{ active: isActive('strike') }"
        @click="editor?.chain().focus().toggleStrike().run()"
        title="취소선"
      >
        <s>S</s>
      </button>
    </div>

    <div class="toolbar-divider" />

    <div class="toolbar-group">
      <!-- Headings -->
      <button
        class="toolbar-btn"
        :class="{ active: isActive('heading', { level: 1 }) }"
        @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
        title="제목 1"
      >
        H1
      </button>
      <button
        class="toolbar-btn"
        :class="{ active: isActive('heading', { level: 2 }) }"
        @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
        title="제목 2"
      >
        H2
      </button>
      <button
        class="toolbar-btn"
        :class="{ active: isActive('heading', { level: 3 }) }"
        @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
        title="제목 3"
      >
        H3
      </button>
    </div>

    <div class="toolbar-divider" />

    <div class="toolbar-group">
      <!-- Text Alignment -->
      <button
        class="toolbar-btn align-btn"
        :class="{ active: isActive({ textAlign: 'left' }) }"
        @click="editor?.chain().focus().setTextAlign('left').run()"
        title="왼쪽 정렬"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <rect x="1" y="2" width="14" height="2"/>
          <rect x="1" y="6" width="10" height="2"/>
          <rect x="1" y="10" width="14" height="2"/>
          <rect x="1" y="14" width="8" height="2"/>
        </svg>
      </button>
      <button
        class="toolbar-btn align-btn"
        :class="{ active: isActive({ textAlign: 'center' }) }"
        @click="editor?.chain().focus().setTextAlign('center').run()"
        title="가운데 정렬"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <rect x="1" y="2" width="14" height="2"/>
          <rect x="3" y="6" width="10" height="2"/>
          <rect x="1" y="10" width="14" height="2"/>
          <rect x="4" y="14" width="8" height="2"/>
        </svg>
      </button>
      <button
        class="toolbar-btn align-btn"
        :class="{ active: isActive({ textAlign: 'right' }) }"
        @click="editor?.chain().focus().setTextAlign('right').run()"
        title="오른쪽 정렬"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <rect x="1" y="2" width="14" height="2"/>
          <rect x="5" y="6" width="10" height="2"/>
          <rect x="1" y="10" width="14" height="2"/>
          <rect x="7" y="14" width="8" height="2"/>
        </svg>
      </button>
    </div>

    <div class="toolbar-divider" />

    <div class="toolbar-group">
      <!-- Indent -->
      <button
        class="toolbar-btn"
        @click="editor?.chain().focus().outdent().run()"
        title="내어쓰기 (Shift+Tab)"
      >
        ←
      </button>
      <button
        class="toolbar-btn"
        @click="editor?.chain().focus().indent().run()"
        title="들여쓰기 (Tab)"
      >
        →
      </button>
    </div>

    <div class="toolbar-divider" />

    <div class="toolbar-group">
      <!-- Block elements -->
      <button
        class="toolbar-btn"
        :class="{ active: isActive('blockquote') }"
        @click="editor?.chain().focus().toggleBlockquote().run()"
        title="인용"
      >
        "
      </button>
      <button
        class="toolbar-btn"
        :class="{ active: isActive('bulletList') }"
        @click="editor?.chain().focus().toggleBulletList().run()"
        title="목록"
      >
        •
      </button>
      <button
        class="toolbar-btn"
        @click="editor?.chain().focus().setHorizontalRule().run()"
        title="구분선"
      >
        —
      </button>
    </div>

    <div class="toolbar-divider" />

    <div class="toolbar-group">
      <!-- Footnote & Export -->
      <button
        class="toolbar-btn"
        @click="emit('toggle-footnotes')"
        title="각주 패널"
      >
        📝
      </button>
      <button
        class="toolbar-btn"
        @click="showExportModal = true"
        title="내보내기"
      >
        📤
      </button>
    </div>

    <div class="toolbar-spacer" />

    <div class="toolbar-group">
      <!-- Font selector -->
      <button
        class="toolbar-btn font-btn"
        @click="showFontSelector = !showFontSelector"
        title="글꼴 설정"
      >
        {{ settingsStore.editorFont }}
      </button>
      <FontSelector 
        v-if="showFontSelector" 
        @close="showFontSelector = false"
      />
    </div>

    <div class="toolbar-divider" />

    <div class="toolbar-group">
      <!-- Mode toggles -->
      <button
        class="toolbar-btn"
        :class="{ active: settingsStore.spellCheck }"
        @click="settingsStore.toggleSpellCheck()"
        title="맞춤법 검사"
      >
        ✓
      </button>
      <button
        class="toolbar-btn"
        :class="{ active: settingsStore.typewriterMode }"
        @click="settingsStore.toggleTypewriterMode()"
        title="타자기 모드"
      >
        ⌨️
      </button>
      <button
        class="toolbar-btn"
        :class="{ active: settingsStore.focusMode }"
        @click="settingsStore.toggleFocusMode()"
        title="집중 모드"
      >
        🎯
      </button>
    </div>
  </div>

  <!-- Export Modal -->
  <ExportModal 
    v-if="showExportModal" 
    @close="showExportModal = false"
  />
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
  gap: 0.25rem;
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 2px;
  position: relative;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: var(--border-color);
  margin: 0 0.5rem;
}

.toolbar-spacer {
  flex: 1;
}

.toolbar-btn {
  padding: 0.375rem 0.625rem;
  border-radius: 4px;
  font-size: 0.875rem;
  color: var(--text-secondary);
  transition: all 0.15s;
  min-width: 32px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toolbar-btn:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.toolbar-btn.active {
  background: var(--accent-color);
  color: white;
}

.toolbar-btn svg {
  display: block;
}

.font-btn {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.align-btn {
  padding: 0.375rem 0.5rem;
}
</style>
