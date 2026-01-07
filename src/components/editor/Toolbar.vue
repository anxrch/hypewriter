<script setup lang="ts">
import { ref } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import { useSettingsStore } from '@/stores/settings'
import FontSelector from './FontSelector.vue'
import ExportModal from './ExportModal.vue'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  IndentDecrease,
  IndentIncrease,
  Quote,
  List,
  Minus,
  FileText,
  Download,
  SpellCheck,
  Keyboard,
  Highlighter
} from 'lucide-vue-next'

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
        <Bold :size="18" />
      </button>
      <button
        class="toolbar-btn"
        :class="{ active: isActive('italic') }"
        @click="editor?.chain().focus().toggleItalic().run()"
        title="기울임 (Ctrl+I)"
      >
        <Italic :size="18" />
      </button>
      <button
        class="toolbar-btn"
        :class="{ active: isActive('underline') }"
        @click="editor?.chain().focus().toggleUnderline().run()"
        title="밑줄 (Ctrl+U)"
      >
        <Underline :size="18" />
      </button>
      <button
        class="toolbar-btn"
        :class="{ active: isActive('strike') }"
        @click="editor?.chain().focus().toggleStrike().run()"
        title="취소선"
      >
        <Strikethrough :size="18" />
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
        <Heading1 :size="18" />
      </button>
      <button
        class="toolbar-btn"
        :class="{ active: isActive('heading', { level: 2 }) }"
        @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
        title="제목 2"
      >
        <Heading2 :size="18" />
      </button>
      <button
        class="toolbar-btn"
        :class="{ active: isActive('heading', { level: 3 }) }"
        @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
        title="제목 3"
      >
        <Heading3 :size="18" />
      </button>
    </div>

    <div class="toolbar-divider" />

    <div class="toolbar-group">
      <!-- Text Alignment -->
      <button
        class="toolbar-btn"
        :class="{ active: isActive({ textAlign: 'left' }) }"
        @click="editor?.chain().focus().setTextAlign('left').run()"
        title="왼쪽 정렬"
      >
        <AlignLeft :size="18" />
      </button>
      <button
        class="toolbar-btn"
        :class="{ active: isActive({ textAlign: 'center' }) }"
        @click="editor?.chain().focus().setTextAlign('center').run()"
        title="가운데 정렬"
      >
        <AlignCenter :size="18" />
      </button>
      <button
        class="toolbar-btn"
        :class="{ active: isActive({ textAlign: 'right' }) }"
        @click="editor?.chain().focus().setTextAlign('right').run()"
        title="오른쪽 정렬"
      >
        <AlignRight :size="18" />
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
        <IndentDecrease :size="18" />
      </button>
      <button
        class="toolbar-btn"
        @click="editor?.chain().focus().indent().run()"
        title="들여쓰기 (Tab)"
      >
        <IndentIncrease :size="18" />
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
        <Quote :size="18" />
      </button>
      <button
        class="toolbar-btn"
        :class="{ active: isActive('bulletList') }"
        @click="editor?.chain().focus().toggleBulletList().run()"
        title="목록"
      >
        <List :size="18" />
      </button>
      <button
        class="toolbar-btn"
        @click="editor?.chain().focus().setHorizontalRule().run()"
        title="구분선"
      >
        <Minus :size="18" />
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
        <FileText :size="18" />
      </button>
      <button
        class="toolbar-btn"
        @click="showExportModal = true"
        title="내보내기"
      >
        <Download :size="18" />
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
        <SpellCheck :size="18" />
      </button>
      <button
        class="toolbar-btn"
        :class="{ active: settingsStore.lineHighlight }"
        @click="settingsStore.toggleLineHighlight()"
        title="줄 하이라이트"
      >
        <Highlighter :size="18" />
      </button>
      <button
        class="toolbar-btn"
        :class="{ active: settingsStore.typewriterMode }"
        @click="settingsStore.toggleTypewriterMode()"
        title="타자기 모드"
      >
        <Keyboard :size="18" />
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
  padding: 0.375rem;
  border-radius: 4px;
  font-size: 0.875rem;
  color: var(--text-secondary);
  transition: all 0.15s;
  min-width: 32px;
  height: 32px;
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

.font-btn {
  padding: 0.375rem 0.625rem;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  height: auto;
}
</style>
