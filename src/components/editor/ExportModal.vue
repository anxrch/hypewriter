<script setup lang="ts">
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import { useProjectStore } from '@/stores/project'
import { useSettingsStore } from '@/stores/settings'
import { FileText, FileType, File, X } from 'lucide-vue-next'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const projectStore = useProjectStore()
const settingsStore = useSettingsStore()
const isExporting = ref(false)
const exportError = ref('')

function htmlToPlainText(html: string): string {
  const temp = document.createElement('div')
  temp.innerHTML = html
  
  // 말풍선을 인용 형식으로 변환
  temp.querySelectorAll('[data-type="bubble"]').forEach(bubble => {
    const position = bubble.getAttribute('data-position')
    const text = bubble.textContent || ''
    const prefix = position === 'right' ? '    > ' : '    < '
    bubble.textContent = prefix + text
    bubble.insertAdjacentText('afterend', '\n\n')
  })
  
  temp.querySelectorAll('p').forEach(p => {
    p.insertAdjacentText('afterend', '\n\n')
  })
  
  temp.querySelectorAll('h1, h2, h3').forEach(h => {
    h.insertAdjacentText('afterend', '\n\n')
  })
  
  temp.querySelectorAll('br').forEach(br => {
    br.replaceWith('\n')
  })
  
  temp.querySelectorAll('blockquote').forEach(bq => {
    const text = bq.textContent || ''
    bq.textContent = text.split('\n').map(line => `    ${line}`).join('\n')
    bq.insertAdjacentText('afterend', '\n\n')
  })
  
  temp.querySelectorAll('li').forEach(li => {
    li.insertAdjacentText('beforebegin', '• ')
    li.insertAdjacentText('afterend', '\n')
  })
  
  return temp.textContent?.trim() || ''
}

// HTML을 DOCX용으로 변환 (말풍선 -> 인용)
function convertBubblesForExport(html: string): string {
  const temp = document.createElement('div')
  temp.innerHTML = html
  
  // 말풍선을 blockquote로 변환
  temp.querySelectorAll('[data-type="bubble"]').forEach(bubble => {
    const position = bubble.getAttribute('data-position')
    const text = bubble.textContent || ''
    const prefix = position === 'right' ? '▶ ' : '◀ '
    
    const blockquote = document.createElement('blockquote')
    blockquote.textContent = prefix + text
    bubble.replaceWith(blockquote)
  })
  
  return temp.innerHTML
}

async function prepareExportContent() {
  if (!projectStore.currentProject) return null
  
  const project = projectStore.currentProject
  const fontPath = await settingsStore.getFontPathForExport()
  
  return {
    title: project.metadata.title,
    author: project.metadata.author,
    font_family: settingsStore.editorFont,
    font_path: fontPath || null,
    chapters: project.chapters.map(chapter => ({
      title: chapter.title,
      content: htmlToPlainText(convertBubblesForExport(chapter.content)),
      footnotes: chapter.footnotes.map(fn => ({
        marker: fn.marker,
        content: fn.content
      }))
    }))
  }
}

async function exportToDocx() {
  const content = await prepareExportContent()
  if (!content) return
  
  const path = await save({
    filters: [{ name: 'Word Document', extensions: ['docx'] }],
    defaultPath: `${content.title}.docx`
  })
  
  if (!path) return
  
  isExporting.value = true
  exportError.value = ''
  
  try {
    await invoke('export_to_docx', { path, content })
    emit('close')
  } catch (error) {
    exportError.value = `DOCX 내보내기 실패: ${error}`
  } finally {
    isExporting.value = false
  }
}

async function exportToPdf() {
  const content = await prepareExportContent()
  if (!content) return
  
  const path = await save({
    filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
    defaultPath: `${content.title}.pdf`
  })
  
  if (!path) return
  
  isExporting.value = true
  exportError.value = ''
  
  try {
    await invoke('export_to_pdf', { path, content })
    emit('close')
  } catch (error) {
    exportError.value = `PDF 내보내기 실패: ${error}`
  } finally {
    isExporting.value = false
  }
}

async function exportToTxt() {
  const content = await prepareExportContent()
  if (!content) return
  
  const path = await save({
    filters: [{ name: 'Text File', extensions: ['txt'] }],
    defaultPath: `${content.title}.txt`
  })
  
  if (!path) return
  
  isExporting.value = true
  exportError.value = ''
  
  try {
    let text = `${content.title}\n`
    if (content.author) {
      text += `${content.author}\n`
    }
    text += '\n'
    
    for (const chapter of content.chapters) {
      text += `${'='.repeat(40)}\n`
      text += `${chapter.title}\n`
      text += `${'='.repeat(40)}\n\n`
      text += `${chapter.content}\n\n`
      
      if (chapter.footnotes.length > 0) {
        text += `${'─'.repeat(20)}\n`
        for (const fn of chapter.footnotes) {
          text += `${fn.marker} ${fn.content}\n`
        }
        text += '\n'
      }
    }
    
    await invoke('write_project_file', { path, content: text })
    emit('close')
  } catch (error) {
    exportError.value = `TXT 내보내기 실패: ${error}`
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <div class="export-modal-overlay" @click.self="emit('close')">
    <div class="export-modal">
      <div class="modal-header">
        <h2>내보내기</h2>
        <button class="close-btn" @click="emit('close')">
          <X :size="18" />
        </button>
      </div>
      
      <div class="modal-content">
        <p class="export-info">
          현재 프로젝트를 다양한 형식으로 내보낼 수 있습니다.
        </p>
        
        <div class="export-options">
          <button 
            class="export-option" 
            @click="exportToDocx"
            :disabled="isExporting"
          >
            <span class="export-icon docx">
              <FileType :size="28" />
            </span>
            <span class="export-label">
              <strong>Word 문서 (.docx)</strong>
              <small>Microsoft Word에서 편집 가능</small>
            </span>
          </button>
          
          <button 
            class="export-option" 
            @click="exportToPdf"
            :disabled="isExporting"
          >
            <span class="export-icon pdf">
              <FileText :size="28" />
            </span>
            <span class="export-label">
              <strong>PDF 문서 (.pdf)</strong>
              <small>폰트: {{ settingsStore.editorFont }}</small>
            </span>
          </button>
          
          <button 
            class="export-option" 
            @click="exportToTxt"
            :disabled="isExporting"
          >
            <span class="export-icon txt">
              <File :size="28" />
            </span>
            <span class="export-label">
              <strong>텍스트 파일 (.txt)</strong>
              <small>순수 텍스트로 저장</small>
            </span>
          </button>
        </div>
        
        <p class="export-note">
          말풍선은 인용(◀ / ▶) 형식으로 변환됩니다.
        </p>
        
        <div v-if="isExporting" class="export-progress">
          내보내는 중...
        </div>
        
        <div v-if="exportError" class="export-error">
          {{ exportError }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.export-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.export-modal {
  background: var(--bg-primary);
  border-radius: 12px;
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: all 0.15s;
}

.close-btn:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.modal-content {
  padding: 1.25rem;
}

.export-info {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.export-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  text-align: left;
  transition: all 0.15s;
}

.export-option:hover:not(:disabled) {
  border-color: var(--accent-color);
  background: var(--bg-secondary);
}

.export-option:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.export-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.export-icon.docx {
  background: #2b579a;
  color: white;
}

.export-icon.pdf {
  background: #e53935;
  color: white;
}

.export-icon.txt {
  background: #607d8b;
  color: white;
}

.export-label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.export-label strong {
  font-size: 0.95rem;
  color: var(--text-primary);
}

.export-label small {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.export-note {
  margin-top: 1rem;
  font-size: 0.8rem;
  color: var(--text-muted);
  text-align: center;
}

.export-progress {
  margin-top: 1rem;
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-radius: 6px;
  text-align: center;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.export-error {
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(255, 59, 48, 0.1);
  border-radius: 6px;
  font-size: 0.85rem;
  color: #ff3b30;
}
</style>
