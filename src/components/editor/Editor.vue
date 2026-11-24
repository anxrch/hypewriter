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
import { CustomBlockquote } from './extensions/CustomBlockquote'
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
      horizontalRule: false,
      blockquote: false
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
    CustomBlockquote
  ],
  editorProps: {
    attributes: {
      class: 'prose-editor',
      spellcheck: settingsStore.spellCheck ? 'true' : 'false',
      autocorrect: 'off',
      autocapitalize: 'off'
    }
  },
  onUpdate: ({ editor }) => {
    if (projectStore.currentChapterId) {
      projectStore.updateChapter(projectStore.currentChapterId, {
        content: editor.getHTML()
      })
    }
    
    updateCharCount()
    scheduleTypewriterScroll()
  },
  // 방향키·클릭으로 커서만 옮겨도 타자기 모드가 따라오게 한다
  onSelectionUpdate: () => {
    scheduleTypewriterScroll()
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
          spellcheck: newValue ? 'true' : 'false',
          autocorrect: 'off',
          autocapitalize: 'off'
        }
      }
    })
  }
})

watch(() => projectStore.currentChapterId, () => {
  if (editor.value && projectStore.currentChapter) {
    editor.value.commands.setContent(projectStore.currentChapter.content || '')
    updateCharCount()
    scheduleTypewriterScroll(false)
  }
})

// ---- 타자기 모드 스크롤 ----
// 키 입력마다 scrollBy({ behavior: 'smooth' })를 새로 걸면 빠르게 칠 때 애니메이션끼리 끊기며
// 덜컹거린다. 한 프레임에 한 번만 목표를 계산하고, 진행 중인 애니메이션은 현재 위치에서
// 새 목표로 이어서 짧게(150ms, ease-out cubic) 움직인다.
const TYPEWRITER_DURATION = 150
let scrollFrame = 0
let animationFrame = 0
// 마우스로 드래그해 선택하는 동안 화면이 따라 움직이면 선택이 안 되므로, 손을 뗄 때 한 번만 맞춘다
// (스크롤바만 끌었다 놓은 경우엔 커서로 되돌아가지 않는다)
let pointerDown = false
let pendingWhileDown = false

function handlePointerDown() {
  pointerDown = true
  pendingWhileDown = false
}

function handlePointerUp() {
  if (!pointerDown) return
  pointerDown = false
  if (pendingWhileDown) scheduleTypewriterScroll()
}

function scheduleTypewriterScroll(animate = true) {
  if (!settingsStore.typewriterMode) return
  if (pointerDown) {
    pendingWhileDown = true
    return
  }
  cancelAnimationFrame(scrollFrame)
  scrollFrame = requestAnimationFrame(() => centerCursor(animate))
}

function centerCursor(animate: boolean) {
  const container = editorContainer.value
  if (!container || !editor.value) return

  const { view } = editor.value
  let coords
  try {
    coords = view.coordsAtPos(view.state.selection.head)
  } catch {
    return
  }

  const containerRect = container.getBoundingClientRect()
  const cursorCenter = (coords.top + coords.bottom) / 2 - containerRect.top
  const offset = cursorCenter - containerRect.height / 2
  const maxScroll = container.scrollHeight - container.clientHeight
  const target = Math.max(0, Math.min(maxScroll, container.scrollTop + offset))

  cancelAnimationFrame(animationFrame)
  if (!animate || Math.abs(target - container.scrollTop) < 1) {
    container.scrollTop = target
    return
  }

  const start = container.scrollTop
  const distance = target - start
  const startTime = performance.now()

  const step = (now: number) => {
    const t = Math.min(1, (now - startTime) / TYPEWRITER_DURATION)
    const eased = 1 - Math.pow(1 - t, 3)
    container.scrollTop = start + distance * eased
    if (t < 1) animationFrame = requestAnimationFrame(step)
  }
  animationFrame = requestAnimationFrame(step)
}

// 타자기 모드를 켜거나 글꼴·크기·폭이 바뀌면 줄 위치가 달라지므로 다시 맞춘다
watch(() => settingsStore.typewriterMode, (on) => {
  if (on) scheduleTypewriterScroll(false)
})

watch(
  () => [settingsStore.editorFontSize, settingsStore.editorLineHeight,
    settingsStore.editorLetterSpacing, settingsStore.editorWidth],
  () => scheduleTypewriterScroll(false)
)

// 글꼴은 바뀐 즉시가 아니라 실제로 로드된 뒤에 재야 위치가 맞는다
watch(() => settingsStore.editorFont, async (family) => {
  try {
    await document.fonts.load(`${settingsStore.editorFontSize}px "${family}"`)
  } catch {
    // 로드 실패 시에도 대체 글꼴 기준으로 다시 맞춘다
  }
  scheduleTypewriterScroll(false)
})

const editorStyles = computed(() => ({
  fontFamily: `"${settingsStore.editorFont}", 'Pretendard', sans-serif`,
  wordBreak: settingsStore.wordBreak,
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
  window.addEventListener('pointerup', handlePointerUp)
  settingsStore.loadSystemFonts()
  // 첫 화면은 폰트가 다 뜨기 전에 그려질 수 있다. 다 뜬 뒤 커서 위치를 다시 잰다.
  document.fonts.ready.then(() => scheduleTypewriterScroll(false))
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('pointerup', handlePointerUp)
  cancelAnimationFrame(scrollFrame)
  cancelAnimationFrame(animationFrame)
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
      @pointerdown="handlePointerDown"
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
  /* 줄바꿈 단위(word-break)는 설정을 따르되, 띄어쓰기 없는 긴 문자열(URL 등)은 어디서든 끊는다 */
  overflow-wrap: break-word;
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

/* 인용 스타일 - 기본 (세로선) */
:deep(.prose-editor .blockquote) {
  margin: 1em 0;
  text-indent: 0;
}

:deep(.prose-editor .blockquote-line) {
  border-left: 3px solid var(--border-color);
  padding-left: 1em;
  color: var(--text-secondary);
  font-style: italic;
}

/* 인용 스타일 - 큰따옴표 */
:deep(.prose-editor .blockquote-quote) {
  position: relative;
  padding: 1.5em 2em;
  font-style: italic;
  color: var(--text-secondary);
  text-align: center;
}

:deep(.prose-editor .blockquote-quote)::before {
  content: '"';
  position: absolute;
  top: 0;
  left: 0;
  font-size: 3em;
  line-height: 1;
  color: var(--border-color);
  font-family: Georgia, serif;
}

:deep(.prose-editor .blockquote-quote)::after {
  content: '"';
  position: absolute;
  bottom: 0;
  right: 0;
  font-size: 3em;
  line-height: 0.5;
  color: var(--border-color);
  font-family: Georgia, serif;
}

/* 인용 스타일 - 박스 */
:deep(.prose-editor .blockquote-box) {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1em 1.25em;
  color: var(--text-secondary);
}

/* 인용 스타일 - 말풍선 공통 */
:deep(.prose-editor .blockquote-bubble-left),
:deep(.prose-editor .blockquote-bubble-right) {
  display: block;
  max-width: 70%;
  padding: 0.75em 1em;
  margin: 0.5em 0;
  border-radius: 1.2em;
  text-indent: 0;
  position: relative;
  clear: both;
  color: #000;
  font-style: normal;
}

:deep(.prose-editor .blockquote-bubble-left) {
  background: #e9e9eb;
  float: left;
  border-bottom-left-radius: 0.3em;
  margin-right: auto;
}

:deep(.prose-editor .blockquote-bubble-right) {
  background: #a8d4ff;
  float: right;
  border-bottom-right-radius: 0.3em;
  margin-left: auto;
}

/* 말풍선 뒤 클리어 */
:deep(.prose-editor .blockquote-bubble-left + *),
:deep(.prose-editor .blockquote-bubble-right + *) {
  clear: both;
}

/* 다크 모드 인용 */
[data-theme="dark"] :deep(.prose-editor .blockquote-bubble-left),
[data-theme="dark"] :deep(.prose-editor .blockquote-bubble-right) {
  color: #fff;
}

[data-theme="dark"] :deep(.prose-editor .blockquote-bubble-left) {
  background: #3a3a3c;
}

[data-theme="dark"] :deep(.prose-editor .blockquote-bubble-right) {
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

/* Line highlight — 커서가 있는 시각적 한 줄만 (LineHighlight.ts가 위치 계산) */
.editor-content > :deep(div) {
  position: relative;
}

:deep(.prose-editor) {
  position: relative;
  z-index: 1;
}

:deep(.line-highlight) {
  display: none;
  position: absolute;
  z-index: 0;
  box-sizing: content-box;
  margin-left: -1rem;
  padding: 0 1rem;
  border-radius: 4px;
  pointer-events: none;
  background: var(--line-highlight-bg, rgba(0, 0, 0, 0.04));
  transition: top 0.08s ease-out, height 0.08s ease-out;
}

.line-highlight-enabled :deep(.line-highlight) {
  display: block;
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
