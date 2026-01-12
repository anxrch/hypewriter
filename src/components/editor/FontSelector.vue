<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@/stores/settings'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const settingsStore = useSettingsStore()
const { availableFonts, isLoadingFonts, editorFont, editorFontSize, editorWidth, editorLineHeight, editorLetterSpacing, useFirstLineIndent, firstLineIndent } = storeToRefs(settingsStore)

const searchQuery = ref('')
const activeTab = ref<'font' | 'paragraph'>('font')

const filteredFonts = computed(() => {
  const fonts = availableFonts.value
  const query = searchQuery.value.toLowerCase().trim()
  
  if (!query) return fonts
  
  return fonts.filter(font => {
    const family = (font.family || '').toLowerCase()
    const fullName = (font.fullName || '').toLowerCase()
    return family.includes(query) || fullName.includes(query)
  })
})

function selectFont(fontFamily: string, fontPath: string) {
  settingsStore.setFont(fontFamily, fontPath)
}

onMounted(() => {
  if (availableFonts.value.length === 0) {
    settingsStore.loadSystemFonts()
  }
})
</script>

<template>
  <div class="font-selector" @click.stop>
    <!-- Tabs -->
    <div class="tabs">
      <button 
        class="tab" 
        :class="{ active: activeTab === 'font' }"
        @click="activeTab = 'font'"
      >
        글꼴
      </button>
      <button 
        class="tab" 
        :class="{ active: activeTab === 'paragraph' }"
        @click="activeTab = 'paragraph'"
      >
        문단
      </button>
    </div>

    <!-- Font Tab -->
    <div v-if="activeTab === 'font'" class="tab-content">
      <div class="font-selector-header">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="글꼴 검색..."
          class="font-search"
        />
      </div>

      <div class="font-settings">
        <div class="setting-row">
          <label>크기</label>
          <input
            type="number"
            v-model.number="editorFontSize"
            min="10"
            max="32"
            class="setting-input"
          />
          <span class="setting-unit">px</span>
        </div>
        <div class="setting-row">
          <label>편집 너비</label>
          <input
            type="number"
            v-model.number="editorWidth"
            min="400"
            max="1200"
            step="50"
            class="setting-input"
          />
          <span class="setting-unit">px</span>
        </div>
      </div>

      <div class="font-list">
        <div v-if="isLoadingFonts" class="loading">
          글꼴 목록을 불러오는 중...
        </div>
        <div
          v-else
          v-for="font in filteredFonts"
          :key="font.family"
          class="font-item"
          :class="{ active: font.family === editorFont }"
          @click="selectFont(font.family, font.path)"
          :style="{ fontFamily: font.family }"
        >
          <span class="font-name">{{ font.fullName || font.family }}</span>
          <span class="font-preview">가나다라 ABC abc 123</span>
          <span v-if="font.path" class="font-format">
            {{ font.path.toLowerCase().endsWith('.otf') ? 'OTF' : 'TTF' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Paragraph Tab -->
    <div v-if="activeTab === 'paragraph'" class="tab-content">
      <div class="paragraph-settings">
        <div class="setting-group">
          <h4>행간 (줄 간격)</h4>
          <div class="setting-row-full">
            <input
              type="range"
              v-model.number="editorLineHeight"
              min="1"
              max="3"
              step="0.1"
              class="setting-slider"
            />
            <span class="setting-value">{{ editorLineHeight.toFixed(1) }}</span>
          </div>
          <div class="setting-preview line-height-preview" :style="{ lineHeight: editorLineHeight }">
            <p>행간 미리보기입니다.</p>
            <p>두 번째 줄입니다.</p>
          </div>
        </div>

        <div class="setting-group">
          <h4>자간 (글자 간격)</h4>
          <div class="setting-row-full">
            <input
              type="range"
              v-model.number="editorLetterSpacing"
              min="-0.1"
              max="0.3"
              step="0.01"
              class="setting-slider"
            />
            <span class="setting-value">{{ editorLetterSpacing.toFixed(2) }}em</span>
          </div>
          <div class="setting-preview" :style="{ letterSpacing: `${editorLetterSpacing}em` }">
            자간 미리보기 텍스트입니다.
          </div>
        </div>

        <div class="setting-group">
          <h4>첫줄 들여쓰기</h4>
          <div class="setting-row-check">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="useFirstLineIndent"
              />
              <span>첫줄 들여쓰기 사용</span>
            </label>
          </div>
          <div class="setting-row-full" v-if="useFirstLineIndent">
            <input
              type="range"
              v-model.number="firstLineIndent"
              min="0"
              max="4"
              step="0.5"
              class="setting-slider"
            />
            <span class="setting-value">{{ firstLineIndent.toFixed(1) }}em</span>
          </div>
          <div 
            class="setting-preview first-line-preview" 
            :style="{ 
              textIndent: useFirstLineIndent ? `${firstLineIndent}em` : '0'
            }"
          >
            <p>첫줄 들여쓰기 미리보기입니다. 이 문단은 설정된 값만큼 첫 번째 줄이 들여쓰기됩니다.</p>
            <p>두 번째 문단입니다. 각 문단의 첫 줄마다 들여쓰기가 적용됩니다.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.font-selector {
  position: absolute;
  top: 100%;
  right: 0;
  width: 360px;
  max-height: 480px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 100;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
}

.tab {
  flex: 1;
  padding: 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  transition: all 0.15s;
}

.tab:hover {
  color: var(--text-primary);
}

.tab.active {
  color: var(--accent-color);
  background: var(--bg-primary);
  border-bottom: 2px solid var(--accent-color);
  margin-bottom: -1px;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.font-selector-header {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.font-search {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  font-size: 0.875rem;
}

.font-settings {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.setting-row label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  min-width: 60px;
}

.setting-input {
  width: 70px;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-secondary);
  font-size: 0.875rem;
  text-align: right;
}

.setting-unit {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.font-list {
  flex: 1;
  overflow-y: auto;
}

.loading {
  padding: 2rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.875rem;
}

.font-item {
  padding: 0.625rem 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid var(--border-color);
  transition: background 0.15s;
  position: relative;
}

.font-item:hover {
  background: var(--bg-secondary);
}

.font-item.active {
  background: var(--accent-color);
  color: white;
}

.font-name {
  display: block;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.font-preview {
  display: block;
  font-size: 0.75rem;
  opacity: 0.7;
}

.font-format {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  font-size: 0.6rem;
  padding: 0.15rem 0.35rem;
  background: var(--bg-secondary);
  border-radius: 3px;
  opacity: 0.6;
}

.font-item.active .font-format {
  background: rgba(255, 255, 255, 0.2);
}

/* Paragraph Settings */
.paragraph-settings {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.setting-group h4 {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.setting-row-full {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.setting-slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--border-color);
  border-radius: 2px;
  outline: none;
}

.setting-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: var(--accent-color);
  border-radius: 50%;
  cursor: pointer;
}

.setting-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: var(--accent-color);
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.setting-value {
  font-size: 0.8rem;
  color: var(--text-secondary);
  min-width: 50px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.setting-row-check {
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--accent-color);
}

.setting-preview {
  padding: 0.75rem;
  background: var(--bg-secondary);
  border-radius: 6px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.setting-preview p {
  margin: 0 0 0.5em 0;
}

.setting-preview p:last-child {
  margin-bottom: 0;
}

.line-height-preview {
  max-height: 80px;
  overflow: hidden;
}

.first-line-preview p {
  margin-bottom: 0.75em;
}
</style>
