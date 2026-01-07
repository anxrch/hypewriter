import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'

export interface FontInfo {
  family: string
  fullName: string
  path: string
}

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<'light' | 'dark'>('light')
  const typewriterMode = ref(false)
  const focusMode = ref(false)
  const spellCheck = ref(true)
  const availableFonts = ref<FontInfo[]>([])
  const isLoadingFonts = ref(false)

  // Editor settings
  const editorFont = ref('Pretendard')
  const editorFontPath = ref('')
  const editorFontSize = ref(16)
  const editorLineHeight = ref(1.8)
  const editorLetterSpacing = ref(0)
  const editorWidth = ref(700)
  const firstLineIndent = ref(1)
  const useFirstLineIndent = ref(true)

  // Load settings from localStorage on init
  function loadSettings() {
    const saved = localStorage.getItem('hypewriter-settings')
    if (saved) {
      const parsed = JSON.parse(saved)
      theme.value = parsed.theme || 'light'
      typewriterMode.value = parsed.typewriterMode || false
      focusMode.value = parsed.focusMode || false
      spellCheck.value = parsed.spellCheck ?? true
      editorFont.value = parsed.editorFont || 'Pretendard'
      editorFontPath.value = parsed.editorFontPath || ''
      editorFontSize.value = parsed.editorFontSize || 16
      editorLineHeight.value = parsed.editorLineHeight || 1.8
      editorLetterSpacing.value = parsed.editorLetterSpacing ?? 0
      editorWidth.value = parsed.editorWidth || 700
      firstLineIndent.value = parsed.firstLineIndent ?? 1
      useFirstLineIndent.value = parsed.useFirstLineIndent ?? true
    }
  }

  // Save settings to localStorage
  function saveSettings() {
    localStorage.setItem('hypewriter-settings', JSON.stringify({
      theme: theme.value,
      typewriterMode: typewriterMode.value,
      focusMode: focusMode.value,
      spellCheck: spellCheck.value,
      editorFont: editorFont.value,
      editorFontPath: editorFontPath.value,
      editorFontSize: editorFontSize.value,
      editorLineHeight: editorLineHeight.value,
      editorLetterSpacing: editorLetterSpacing.value,
      editorWidth: editorWidth.value,
      firstLineIndent: firstLineIndent.value,
      useFirstLineIndent: useFirstLineIndent.value
    }))
  }

  // Watch for changes and auto-save
  watch([
    theme, typewriterMode, focusMode, spellCheck, editorFont, editorFontPath,
    editorFontSize, editorLineHeight, editorLetterSpacing, editorWidth, 
    firstLineIndent, useFirstLineIndent
  ], () => {
    saveSettings()
  })

  // Apply theme to document
  watch(theme, (newTheme) => {
    document.documentElement.setAttribute('data-theme', newTheme)
  })

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  function toggleTypewriterMode() {
    typewriterMode.value = !typewriterMode.value
  }

  function toggleFocusMode() {
    focusMode.value = !focusMode.value
  }

  function toggleSpellCheck() {
    spellCheck.value = !spellCheck.value
  }

  function toggleFirstLineIndent() {
    useFirstLineIndent.value = !useFirstLineIndent.value
  }

  function setFont(family: string, path: string) {
    editorFont.value = family
    editorFontPath.value = path
  }

  // 폰트 경로 찾기 (폰트 이름으로)
  function findFontPath(fontFamily: string): string {
    const font = availableFonts.value.find(
      f => f.family === fontFamily || f.fullName === fontFamily
    )
    return font?.path || ''
  }

  // 현재 폰트 경로 확인 및 복구
  function ensureFontPath() {
    if (!editorFontPath.value && editorFont.value && availableFonts.value.length > 0) {
      const path = findFontPath(editorFont.value)
      if (path) {
        editorFontPath.value = path
        saveSettings()
      }
    }
  }

  async function loadSystemFonts() {
    if (isLoadingFonts.value) return
    
    isLoadingFonts.value = true
    try {
      const fonts = await invoke<FontInfo[]>('get_system_fonts')
      availableFonts.value = fonts
      
      // 폰트 로드 후 현재 폰트 경로 확인 및 복구
      ensureFontPath()
    } catch (error) {
      console.error('Failed to load system fonts:', error)
      availableFonts.value = [
        { family: 'Pretendard', fullName: 'Pretendard', path: '' },
        { family: 'Noto Sans KR', fullName: 'Noto Sans KR', path: '' },
        { family: 'Noto Serif KR', fullName: 'Noto Serif KR', path: '' },
        { family: 'Malgun Gothic', fullName: '맑은 고딕', path: '' },
        { family: 'Batang', fullName: '바탕', path: '' }
      ]
    } finally {
      isLoadingFonts.value = false
    }
  }

  // PDF 내보내기용 폰트 경로 가져오기
  async function getFontPathForExport(): Promise<string> {
    // 이미 경로가 있으면 반환
    if (editorFontPath.value) {
      return editorFontPath.value
    }
    
    // 폰트 목록이 없으면 로드
    if (availableFonts.value.length === 0) {
      await loadSystemFonts()
    }
    
    // 현재 폰트에서 경로 찾기
    const path = findFontPath(editorFont.value)
    if (path) {
      editorFontPath.value = path
      saveSettings()
      return path
    }
    
    return ''
  }

  // Initialize
  loadSettings()

  return {
    theme,
    typewriterMode,
    focusMode,
    spellCheck,
    availableFonts,
    isLoadingFonts,
    editorFont,
    editorFontPath,
    editorFontSize,
    editorLineHeight,
    editorLetterSpacing,
    editorWidth,
    firstLineIndent,
    useFirstLineIndent,
    toggleTheme,
    toggleTypewriterMode,
    toggleFocusMode,
    toggleSpellCheck,
    toggleFirstLineIndent,
    setFont,
    loadSystemFonts,
    getFontPathForExport
  }
})
