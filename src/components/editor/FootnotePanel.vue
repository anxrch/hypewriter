<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProjectStore, type Footnote } from '@/stores/project'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const projectStore = useProjectStore()

const newFootnoteContent = ref('')

const footnotes = computed(() => {
  return projectStore.currentChapter?.footnotes || []
})

function generateMarker(index: number): string {
  // Use symbols like *, †, ‡, §, etc. for literary footnotes
  const markers = ['*', '†', '‡', '§', '‖', '¶', '#', '**', '††', '‡‡']
  return markers[index % markers.length]
}

function addFootnote() {
  if (!newFootnoteContent.value.trim() || !projectStore.currentChapterId) return

  const currentFootnotes = [...footnotes.value]
  const newFootnote: Footnote = {
    id: crypto.randomUUID(),
    marker: generateMarker(currentFootnotes.length),
    content: newFootnoteContent.value.trim()
  }

  currentFootnotes.push(newFootnote)
  projectStore.updateChapter(projectStore.currentChapterId, {
    footnotes: currentFootnotes
  })

  newFootnoteContent.value = ''
}

function removeFootnote(id: string) {
  if (!projectStore.currentChapterId) return

  const updatedFootnotes = footnotes.value
    .filter(f => f.id !== id)
    .map((f, index) => ({
      ...f,
      marker: generateMarker(index)
    }))

  projectStore.updateChapter(projectStore.currentChapterId, {
    footnotes: updatedFootnotes
  })
}

function updateFootnoteContent(id: string, content: string) {
  if (!projectStore.currentChapterId) return

  const updatedFootnotes = footnotes.value.map(f =>
    f.id === id ? { ...f, content } : f
  )

  projectStore.updateChapter(projectStore.currentChapterId, {
    footnotes: updatedFootnotes
  })
}

function copyMarker(marker: string) {
  navigator.clipboard.writeText(`[${marker}]`)
}
</script>

<template>
  <div class="footnote-panel">
    <div class="panel-header">
      <h3>각주</h3>
      <button class="close-btn" @click="emit('close')">×</button>
    </div>

    <div class="panel-content">
      <!-- Add new footnote -->
      <div class="add-footnote">
        <textarea
          v-model="newFootnoteContent"
          placeholder="새 각주 내용을 입력하세요..."
          rows="2"
          class="footnote-input"
          @keydown.ctrl.enter="addFootnote"
        />
        <button class="add-btn" @click="addFootnote" :disabled="!newFootnoteContent.trim()">
          추가
        </button>
      </div>

      <!-- Footnote list -->
      <div class="footnote-list">
        <div class="footnote-hint" v-if="footnotes.length === 0">
          각주를 추가하면 여기에 표시됩니다.
          <br />
          각주 기호를 클릭하면 본문에 삽입할 기호가 복사됩니다.
        </div>

        <div 
          v-for="footnote in footnotes" 
          :key="footnote.id" 
          class="footnote-item"
        >
          <div class="footnote-header">
            <span 
              class="footnote-marker" 
              @click="copyMarker(footnote.marker)"
              title="클릭하여 기호 복사"
            >
              {{ footnote.marker }}
            </span>
            <button 
              class="remove-btn"
              @click="removeFootnote(footnote.id)"
              title="삭제"
            >
              ×
            </button>
          </div>
          <textarea
            :value="footnote.content"
            @input="(e) => updateFootnoteContent(footnote.id, (e.target as HTMLTextAreaElement).value)"
            class="footnote-content"
            rows="2"
          />
        </div>
      </div>
    </div>

    <div class="panel-footer">
      <div class="footer-hint">
        💡 각주 기호를 복사한 후 본문에서 원하는 위치에 붙여넣기 하세요.
      </div>
    </div>
  </div>
</template>

<style scoped>
.footnote-panel {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 320px;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  z-index: 50;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.panel-header h3 {
  font-size: 1rem;
  font-weight: 600;
}

.close-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  font-size: 1.25rem;
  color: var(--text-muted);
  transition: all 0.15s;
}

.close-btn:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.add-footnote {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.footnote-input {
  width: 100%;
  padding: 0.625rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  font-size: 0.875rem;
  resize: vertical;
}

.add-btn {
  align-self: flex-end;
  padding: 0.5rem 1rem;
  background: var(--accent-color);
  color: white;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: background 0.15s;
}

.add-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.footnote-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.footnote-hint {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.875rem;
  padding: 2rem 1rem;
  line-height: 1.6;
}

.footnote-item {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.75rem;
}

.footnote-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.footnote-marker {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--accent-color);
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background 0.15s;
}

.footnote-marker:hover {
  background: var(--bg-secondary);
}

.remove-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  font-size: 1rem;
  color: var(--text-muted);
  transition: all 0.15s;
}

.remove-btn:hover {
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
}

.footnote-content {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-secondary);
  font-size: 0.875rem;
  resize: vertical;
}

.panel-footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border-color);
}

.footer-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.5;
}
</style>
