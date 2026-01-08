<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { Indent } from './extensions/Indent'
import { LineHighlight } from './extensions/LineHighlight'
import { CustomHorizontalRule } from './extensions/CustomHorizontalRule'
import { Bubble } from './extensions/Bubble'
import { useProjectStore } from '@/stores/project'
import { useSettingsStore } from '@/stores/settings'
import Toolbar from './Toolbar.vue'
import FootnotePanel from './FootnotePanel.vue'

const projectStore = useProjectStore()
const settingsStore = useSettingsStore()

const editorContainer = ref<HTMLElement | null>(null)
const showFootnotePanel = ref(false)

// 글자수 세기
const charCount = ref(0)
const charCountNoSpaces = ref(0)

function updateCharCount() {
  if (!editor.value) return
  const text = editor.value.state.doc.textContent
  charCount.value = text.length
  charCountNoSpaces.value = text.replace(/\s/g, '').length
}

const editor = useEditor({
  content: projectStore.currentChapter?.content || '',
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3]
      },
      horizontalRule: false
    }),
    Placeholder.configure({
      placeholder: '이야기를 시작하세요...'
    }),
    Typography,
    Underline,
    TextAlign.configure({
      types: ['heading', 'paragraph']
    }),
    Indent,
    LineHighlight,
    CustomHorizontalRule,
    Bubble
  ],
  editorProps: {
    attributes: {
      class: 'prose-editor',
      spellcheck: settingsStore.spellCheck ? 'true' : 'false'
    }
  },
  onUpdate: ({ editor }) => {
    if (projectStore.currentChapterId) {
      projectStore.updateChapter(projectStore.currentChapterId, {
        content: editor.getHTML()
      })
    }
    
    updateCharCount()
    
    if (settingsStore.typewriterMode) {
      scrollToCursor()
    }
  },
  onCreate: () => {
    updateCharCount()
  }
})

watch(() => settingsStore.spellCheck, (newValue) => {
  if (editor.value) {
    editor.value.setOptions({
      editorProps: {
        attributes: {
          class: 'prose-editor',
          spellcheck: newValue ? 'true' : 'false'
        }
      }
    })
  }
})

watch(() => projectStore.currentChapterId, () => {
  if (editor.value && projectStore.currentChapter) {
    editor.value.commands.setContent(projectStore.currentChapter.content || '')
    updateCharCount()
  }
})

function scrollToCursor() {
  if (!editorContainer.value || !editor.value) return
  
  const { view } = editor.value
  const { from } = view.state.selection
  const coords = view.coordsAtPos(from)
  
  const containerRect = editorContainer.value.getBoundingClientRect()
  const centerY = containerRect.height / 2
  const cursorY = coords.top - containerRect.top
  
  const scrollOffset = cursorY - centerY
  editorContainer.value.scrollBy({
    top: scrollOffset,
    behavior: 'smooth'
  })
}

const editorStyles = computed(() => ({
  fontFamily: settingsStore.editorFont,
  fontSize: `${settingsStore.editorFontSize}px`,
  lineHeight: settingsStore.editorLineHeight,
  letterSpacing: `${settingsStore.editorLetterSpacing}em`,
  maxWidth: `${settingsStore.editorWidth}px`,
  '--first-line-indent': settingsStore.useFirstLineIndent 
    ? `${settingsStore.firstLineIndent}em` 
    : '0'
}))

function handleKeydown(e: KeyboardEvent) {
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault()
    projectStore.saveProject()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  settingsStore.loadSystemFonts()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="editor-wrapper">
    <Toolbar 
      :editor="editor" 
      @toggle-footnotes="showFootnotePanel = !showFootnotePanel"
    />

    <div 
      class="editor-container"
      ref="editorContainer"
      :class="{ 
        'typewriter-mode': settingsStore.typewriterMode,
        'line-highlight-enabled': settingsStore.lineHighlight
      }"
    >
      <div class="editor-content" :style="editorStyles">
        <EditorContent :editor="editor" />
      </div>
    </div>

    <!-- 상태 바 -->
    <div class="status-bar">
      <span class="char-count">
        {{ charCountNoSpaces.toLocaleString() }}자 (공백 포함 {{ charCount.toLocaleString() }}자)
      </span>
    </div>

    <FootnotePanel 
      v-if="showFootnotePanel" 
      @close="showFootnotePanel = false"
    />
  </div>
</template>

<style scoped>
.editor-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
}

.editor-container {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

.editor-container.typewriter-mode {
  padding-top: 45vh;
  padding-bottom: 45vh;
}

.editor-content {
  margin: 0 auto;
  min-height: 100%;
}

/* 상태 바 */
.status-bar {
  padding: 0.5rem 1rem;
  border-top: 1px solid var(--border-color);
  background: var(--bg-secondary);
  font-size: 0.8rem;
  color: var(--text-muted);
  display: flex;
  justify-content: flex-end;
}

.char-count {
  font-variant-numeric: tabular-nums;
}

/* Prose Editor Styles */
:deep(.prose-editor) {
  outline: none;
  min-height: 100%;
}

:deep(.prose-editor p) {
  margin-bottom: 1em;
  text-indent: var(--first-line-indent, 0);
}

:deep(.prose-editor p[style*="text-align: center"]),
:deep(.prose-editor p[style*="text-align: right"]) {
  text-indent: 0;
}

:deep(.prose-editor h1) {
  font-size: 2em;
  font-weight: 700;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  text-indent: 0;
}

:deep(.prose-editor h2) {
  font-size: 1.5em;
  font-weight: 600;
  margin-top: 1.25em;
  margin-bottom: 0.5em;
  text-indent: 0;
}

:deep(.prose-editor h3) {
  font-size: 1.25em;
  font-weight: 600;
  margin-top: 1em;
  margin-bottom: 0.5em;
  text-indent: 0;
}

:deep(.prose-editor strong) {
  font-weight: 700;
}

:deep(.prose-editor em) {
  font-style: italic;
}

:deep(.prose-editor u) {
  text-decoration: underline;
}

:deep(.prose-editor blockquote) {
  border-left: 3px solid var(--border-color);
  padding-left: 1em;
  margin: 1em 0;
  color: var(--text-secondary);
  font-style: italic;
  text-indent: 0;
}

:deep(.prose-editor blockquote p) {
  text-indent: 0;
}

:deep(.prose-editor ul),
:deep(.prose-editor ol) {
  padding-left: 1.5em;
  margin: 1em 0;
}

:deep(.prose-editor li) {
  margin-bottom: 0.25em;
}

:deep(.prose-editor li p) {
  text-indent: 0;
}

/* 구분선 스타일 */
:deep(.prose-editor hr) {
  border: none;
  margin: 2em 0;
  text-align: center;
}

:deep(.prose-editor hr[data-type="solid"]) {
  border-top: 1px solid var(--border-color);
}

:deep(.prose-editor hr[data-type="dashed"]) {
  border-top: 1px dashed var(--border-color);
}

:deep(.prose-editor hr[data-type="dotted"]) {
  border-top: 2px dotted var(--border-color);
}

:deep(.prose-editor hr[data-type="stars"])::before {
  content: '✦   ✦   ✦';
  color: var(--text-muted);
  font-size: 0.9em;
  letter-spacing: 0.5em;
}

:deep(.prose-editor hr[data-type="dots"])::before {
  content: '• • •';
  color: var(--text-muted);
  font-size: 1.2em;
  letter-spacing: 0.8em;
}

:deep(.prose-editor hr[data-type="flourish"])::before {
  content: '❧';
  color: var(--text-muted);
  font-size: 1.5em;
}

:deep(.prose-editor hr[data-type="wave"])::before {
  content: '～～～';
  color: var(--text-muted);
  font-size: 1em;
  letter-spacing: 0.3em;
}

/* 말풍선 스타일 */
:deep(.prose-editor .bubble) {
  display: block;
  max-width: 70%;
  padding: 0.75em 1em;
  margin: 0.5em 0;
  border-radius: 1.2em;
  text-indent: 0;
  position: relative;
  clear: both;
  color: #000;
}

:deep(.prose-editor .bubble-left) {
  background: #e9e9eb;
  float: left;
  border-bottom-left-radius: 0.3em;
  margin-right: auto;
}

:deep(.prose-editor .bubble-right) {
  background: #a8d4ff;
  float: right;
  border-bottom-right-radius: 0.3em;
  margin-left: auto;
}

/* 말풍선 뒤 클리어 */
:deep(.prose-editor .bubble + *) {
  clear: both;
}

/* 다크 모드 말풍선 */
[data-theme="dark"] :deep(.prose-editor .bubble) {
  color: #fff;
}

[data-theme="dark"] :deep(.prose-editor .bubble-left) {
  background: #3a3a3c;
}

[data-theme="dark"] :deep(.prose-editor .bubble-right) {
  background: #2a5a8a;
}

/* Placeholder */
:deep(.prose-editor p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: var(--text-muted);
  pointer-events: none;
  height: 0;
}

/* Line highlight */
.line-highlight-enabled :deep(.line-highlight) {
  background: var(--line-highlight-bg, rgba(0, 0, 0, 0.04));
  margin-left: -1rem;
  margin-right: -1rem;
  padding-left: 1rem;
  padding-right: 1rem;
  border-radius: 4px;
  transition: background 0.15s;
}

[data-theme="dark"] .line-highlight-enabled :deep(.line-highlight) {
  background: rgba(255, 255, 255, 0.05);
}

/* Footnote marker style */
:deep(.footnote-marker) {
  color: var(--accent-color);
  cursor: pointer;
  font-size: 0.75em;
  vertical-align: super;
}

:deep(.footnote-marker:hover) {
  text-decoration: underline;
}
</style>
