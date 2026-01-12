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
  Highlighter,
  ChevronDown
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
const showDividerMenu = ref(false)
const showQuoteMenu = ref(false)

const dividerTypes = [
  { type: 'solid', label: '실선', preview: '───────' },
  { type: 'dashed', label: '파선', preview: '- - - - -' },
  { type: 'dotted', label: '점선', preview: '· · · · · · ·' },
  { type: 'stars', label: '별표', preview: '✦   ✦   ✦' },
  { type: 'dots', label: '점', preview: '• • •' },
  { type: 'flourish', label: '장식', preview: '❧' },
  { type: 'wave', label: '물결', preview: '～～～' }
]

const quoteTypes = [
  { type: 'line', label: '세로선', icon: '│' },
  { type: 'quote', label: '따옴표', icon: '❝❞' },
  { type: 'box', label: '박스', icon: '▢' },
  { type: 'bubble-left', label: '말풍선 (왼쪽)', icon: '◁' },
  { type: 'bubble-right', label: '말풍선 (오른쪽)', icon: '▷' }
]

function insertDivider(type: string) {
  props.editor?.chain().focus().setHorizontalRule(type).run()
  showDividerMenu.value = false
}

function insertQuote(type: string) {
  props.editor?.chain().focus().setBlockquote(type).run()
  showQuoteMenu.value = false
}

function removeQuote() {
  props.editor?.chain().focus().unsetBlockquote().run()
  showQuoteMenu.value = false
}

function isActive(name: string, attrs?: object): boolean {
  return props.editor?.isActive(name, attrs) ?? false
}

function isInBlockquote(): boolean {
  if (!props.editor) return false
  const { $from } = props.editor.state.selection
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name === 'blockquote') {
      return true
    }
  }
  return false
}

function closeAllMenus() {
  showDividerMenu.value = false
  showQuoteMenu.value = false
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
      
      <!-- 인용 드롭다운 -->
      <div class="dropdown-wrapper">
        <button
          class="toolbar-btn dropdown-btn"
          :class="{ active: isInBlockquote() }"
          @click="showQuoteMenu = !showQuoteMenu; showDividerMenu = false"
          title="인용"
        >
          <Quote :size="18" />
          <ChevronDown :size="12" />
        </button>
        
        <div v-if="showQuoteMenu" class="dropdown-menu quote-menu">
          <button
            v-for="quote in quoteTypes"
            :key="quote.type"
            class="dropdown-item quote-item"
            @click="insertQuote(quote.type)"
          >
            <span class="quote-icon">{{ quote.icon }}</span>
            <span class="quote-label">{{ quote.label }}</span>
          </button>
          <button 
            v-if="isInBlockquote()"
            class="dropdown-item quote-item-remove" 
            @click="removeQuote"
          >
            인용 해제
          </button>
        </div>
      </div>

      <button
        class="toolbar-btn"
        :class="{ active: isActive('bulletList') }"
        @click="editor?.chain().focus().toggleBulletList().run()"
        title="목록"
      >
        <List :size="18" />
      </button>
      
      <!-- 구분선 드롭다운 -->
      <div class="dropdown-wrapper">
        <button
          class="toolbar-btn dropdown-btn"
          @click="showDividerMenu = !showDividerMenu; showQuoteMenu = false"
          title="구분선"
        >
          <Minus :size="18" />
          <ChevronDown :size="12" />
        </button>
        
        <div v-if="showDividerMenu" class="dropdown-menu divider-menu">
          <button
            v-for="divider in dividerTypes"
            :key="divider.type"
            class="dropdown-item"
            @click="insertDivider(divider.type)"
          >
            <span class="divider-preview">{{ divider.preview }}</span>
            <span class="divider-label">{{ divider.label }}</span>
          </button>
        </div>
      </div>
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

  <!-- Backdrop to close dropdowns -->
  <div 
    v-if="showDividerMenu || showQuoteMenu" 
    class="dropdown-backdrop"
    @click="closeAllMenus"
  />

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

/* Dropdown */
.dropdown-wrapper {
  position: relative;
}

.dropdown-btn {
  gap: 2px;
  padding-right: 0.25rem;
}

.dropdown-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  min-width: 160px;
  padding: 0.25rem;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-size: 0.85rem;
  color: var(--text-primary);
  transition: background 0.15s;
}

.dropdown-item:hover {
  background: var(--border-color);
}

.divider-preview {
  flex: 1;
  font-size: 0.8rem;
  color: var(--text-muted);
  text-align: center;
}

.divider-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  min-width: 2.5rem;
}

/* 인용 메뉴 */
.quote-menu {
  min-width: 180px;
}

.quote-item {
  justify-content: flex-start;
}

.quote-icon {
  width: 24px;
  text-align: center;
  font-size: 1rem;
  color: var(--text-muted);
}

.quote-label {
  font-size: 0.85rem;
}

.quote-item-remove {
  justify-content: center;
  color: var(--text-muted);
  font-size: 0.8rem;
  border-top: 1px solid var(--border-color);
  margin-top: 0.25rem;
  padding-top: 0.5rem;
}
</style>
