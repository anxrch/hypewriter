import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'

export interface FontInfo {
  family: string
  fullName: string
  path: string
}

// normal: 한글은 글자 단위로, 영문 단어는 통째로 끊는다(워드프로세서식)
// keep-all: 띄어쓰기(어절) 단위로만 끊는다
export const BUNDLED_FONT = 'Pretendard'

export type WordBreak = 'normal' | 'keep-all'

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<'light' | 'dark'>('light')
  const typewriterMode = ref(false)
  const lineHighlight = ref(true)
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
  const wordBreak = ref<WordBreak>('normal')

  function loadSettings() {
    const saved = localStorage.getItem('hypewriter-settings')
    if (saved) {
      const parsed = JSON.parse(saved)
      theme.value = parsed.theme || 'light'
      typewriterMode.value = parsed.typewriterMode || false
      lineHighlight.value = parsed.lineHighlight ?? true
      spellCheck.value = parsed.spellCheck ?? true
      editorFont.value = parsed.editorFont || 'Pretendard'
      editorFontPath.value = parsed.editorFontPath || ''
      editorFontSize.value = parsed.editorFontSize || 16
      editorLineHeight.value = parsed.editorLineHeight || 1.8
      editorLetterSpacing.value = parsed.editorLetterSpacing ?? 0
      editorWidth.value = parsed.editorWidth || 700
      firstLineIndent.value = parsed.firstLineIndent ?? 1
      useFirstLineIndent.value = parsed.useFirstLineIndent ?? true
      wordBreak.value = parsed.wordBreak === 'keep-all' ? 'keep-all' : 'normal'
    }
  }

  function saveSettings() {
    localStorage.setItem('hypewriter-settings', JSON.stringify({
      theme: theme.value,
      typewriterMode: typewriterMode.value,
      lineHighlight: lineHighlight.value,
      spellCheck: spellCheck.value,
      editorFont: editorFont.value,
      editorFontPath: editorFontPath.value,
      editorFontSize: editorFontSize.value,
      editorLineHeight: editorLineHeight.value,
      editorLetterSpacing: editorLetterSpacing.value,
      editorWidth: editorWidth.value,
      firstLineIndent: firstLineIndent.value,
      useFirstLineIndent: useFirstLineIndent.value,
      wordBreak: wordBreak.value
    }))
  }

  watch([
    theme, typewriterMode, lineHighlight, spellCheck, editorFont, editorFontPath,
    editorFontSize, editorLineHeight, editorLetterSpacing, editorWidth, 
    firstLineIndent, useFirstLineIndent, wordBreak
  ], () => {
    saveSettings()
  })

  watch(theme, (newTheme) => {
    document.documentElement.setAttribute('data-theme', newTheme)
  })

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  function toggleTypewriterMode() {
    typewriterMode.value = !typewriterMode.value
  }

  function toggleLineHighlight() {
    lineHighlight.value = !lineHighlight.value
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

  function findFontPath(fontFamily: string): string {
    const font = availableFonts.value.find(
      f => f.family === fontFamily || f.fullName === fontFamily
    )
    return font?.path || ''
  }

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
      // Pretendard는 앱에 동봉돼 있어 설치 여부와 상관없이 쓸 수 있다
      // (화면은 @font-face, PDF는 바이너리에 내장된 OTF)
      if (!fonts.some(f => f.family === BUNDLED_FONT)) {
        fonts.unshift({ family: BUNDLED_FONT, fullName: `${BUNDLED_FONT} (내장)`, path: '' })
      }
      availableFonts.value = fonts
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

  async function getFontPathForExport(): Promise<string> {
    if (editorFontPath.value) {
      return editorFontPath.value
    }
    
    if (availableFonts.value.length === 0) {
      await loadSystemFonts()
    }
    
    const path = findFontPath(editorFont.value)
    if (path) {
      editorFontPath.value = path
      saveSettings()
      return path
    }
    
    return ''
  }

  loadSettings()

  return {
    theme,
    typewriterMode,
    lineHighlight,
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
    wordBreak,
    toggleTheme,
    toggleTypewriterMode,
    toggleLineHighlight,
    toggleSpellCheck,
    toggleFirstLineIndent,
    setFont,
    loadSystemFonts,
    getFontPathForExport
  }
})
