<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Typography from '@tiptap/extension-typography'
import Underline from '@tiptap/extension-underline'
import { Indent } from './extensions/Indent'
import { useProjectStore } from '@/stores/project'
import { useSettingsStore } from '@/stores/settings'
import Toolbar from './Toolbar.vue'
import FootnotePanel from './FootnotePanel.vue'

const projectStore = useProjectStore()
const settingsStore = useSettingsStore()

const editorContainer = ref<HTMLElement | null>(null)
const showFootnotePanel = ref(false)

const editor = useEditor({
  content: projectStore.currentChapter?.content || '',
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3]
      }
    }),
    Placeholder.configure({
      placeholder: '이야기를 시작하세요...'
    }),
    Typography,
    Underline,
    Indent
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
    
    // Typewriter mode: scroll to cursor
    if (settingsStore.typewriterMode) {
      scrollToCursor()
    }
  }
})

// Watch for spellcheck changes
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

// Watch for chapter changes
watch(() => projectStore.currentChapterId, () => {
  if (editor.value && projectStore.currentChapter) {
    editor.value.commands.setContent(projectStore.currentChapter.content || '')
  }
})

// Typewriter mode: keep cursor centered
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

// Editor styles computed
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

// Keyboard shortcuts
function handleKeydown(e: KeyboardEvent) {
  // Ctrl+S to save
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
    <!-- Toolbar -->
    <Toolbar 
      :editor="editor" 
      @toggle-footnotes="showFootnotePanel = !showFootnotePanel"
    />

    <!-- Editor Area -->
    <div 
      class="editor-container"
      ref="editorContainer"
      :class="{ 
        'typewriter-mode': settingsStore.typewriterMode,
        'focus-mode': settingsStore.focusMode 
      }"
    >
      <div class="editor-content" :style="editorStyles">
        <EditorContent :editor="editor" />
      </div>
    </div>

    <!-- Footnote Panel -->
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

.editor-container.focus-mode {
  background: var(--bg-primary);
}

.editor-content {
  margin: 0 auto;
  min-height: 100%;
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

:deep(.prose-editor hr) {
  border: none;
  border-top: 1px solid var(--border-color);
  margin: 2em 0;
}

/* Placeholder */
:deep(.prose-editor p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: var(--text-muted);
  pointer-events: none;
  height: 0;
}

/* Focus mode - fade non-focused paragraphs */
.focus-mode :deep(.prose-editor > *:not(:focus-within)) {
  opacity: 0.3;
  transition: opacity 0.3s;
}

.focus-mode :deep(.prose-editor > *:focus-within) {
  opacity: 1;
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
