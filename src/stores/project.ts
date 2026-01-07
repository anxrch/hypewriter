import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'

export interface Footnote {
  id: string
  marker: string
  content: string
}

export interface Chapter {
  id: string
  title: string
  content: string
  footnotes: Footnote[]
  createdAt: string
  modifiedAt: string
}

export interface Project {
  version: string
  metadata: {
    title: string
    author: string
    created: string
    modified: string
  }
  settings: {
    font: string
    fontSize: number
    lineHeight: number
  }
  chapters: Chapter[]
}

export const useProjectStore = defineStore('project', () => {
  const currentProject = ref<Project | null>(null)
  const currentChapterId = ref<string | null>(null)
  const projectPath = ref<string | null>(null)
  const isDirty = ref(false)

  const currentChapter = computed(() => {
    if (!currentProject.value || !currentChapterId.value) return null
    return currentProject.value.chapters.find(c => c.id === currentChapterId.value) || null
  })

  function generateId(): string {
    return crypto.randomUUID()
  }

  function createEmptyProject(title: string = '새 프로젝트'): Project {
    const now = new Date().toISOString()
    return {
      version: '1.0',
      metadata: {
        title,
        author: '',
        created: now,
        modified: now
      },
      settings: {
        font: 'Pretendard',
        fontSize: 16,
        lineHeight: 1.8
      },
      chapters: []
    }
  }

  async function createProject() {
    const path = await save({
      filters: [{ name: 'Hypewriter Project', extensions: ['hype'] }],
      defaultPath: '새 프로젝트.hype'
    })

    if (path) {
      const project = createEmptyProject()
      currentProject.value = project
      projectPath.value = path
      
      // Add initial chapter
      addChapter('제1장')
      
      await saveProject()
    }
  }

  async function openProject() {
    const path = await open({
      filters: [{ name: 'Hypewriter Project', extensions: ['hype'] }],
      multiple: false
    })

    if (path && typeof path === 'string') {
      try {
        const content = await invoke<string>('read_project_file', { path })
        const project = JSON.parse(content) as Project
        currentProject.value = project
        projectPath.value = path
        isDirty.value = false

        // Select first chapter if exists
        if (project.chapters.length > 0) {
          currentChapterId.value = project.chapters[0].id
        }
      } catch (error) {
        console.error('Failed to open project:', error)
      }
    }
  }

  async function saveProject() {
    if (!currentProject.value || !projectPath.value) return

    currentProject.value.metadata.modified = new Date().toISOString()
    
    try {
      await invoke('write_project_file', {
        path: projectPath.value,
        content: JSON.stringify(currentProject.value, null, 2)
      })
      isDirty.value = false
    } catch (error) {
      console.error('Failed to save project:', error)
    }
  }

  function addChapter(title: string = '새 챕터') {
    if (!currentProject.value) return

    const now = new Date().toISOString()
    const chapter: Chapter = {
      id: generateId(),
      title,
      content: '',
      footnotes: [],
      createdAt: now,
      modifiedAt: now
    }

    currentProject.value.chapters.push(chapter)
    currentChapterId.value = chapter.id
    isDirty.value = true
  }

  function deleteChapter(id: string) {
    if (!currentProject.value) return

    const index = currentProject.value.chapters.findIndex(c => c.id === id)
    if (index !== -1) {
      currentProject.value.chapters.splice(index, 1)
      
      // Select another chapter
      if (currentChapterId.value === id) {
        const chapters = currentProject.value.chapters
        currentChapterId.value = chapters.length > 0 ? chapters[Math.max(0, index - 1)].id : null
      }
      
      isDirty.value = true
    }
  }

  function updateChapter(id: string, updates: Partial<Chapter>) {
    if (!currentProject.value) return

    const chapter = currentProject.value.chapters.find(c => c.id === id)
    if (chapter) {
      Object.assign(chapter, updates, { modifiedAt: new Date().toISOString() })
      isDirty.value = true
    }
  }

  function selectChapter(id: string) {
    currentChapterId.value = id
  }

  function reorderChapters(fromIndex: number, toIndex: number) {
    if (!currentProject.value) return

    const chapters = currentProject.value.chapters
    const [removed] = chapters.splice(fromIndex, 1)
    chapters.splice(toIndex, 0, removed)
    isDirty.value = true
  }

  return {
    currentProject,
    currentChapterId,
    currentChapter,
    projectPath,
    isDirty,
    createProject,
    openProject,
    saveProject,
    addChapter,
    deleteChapter,
    updateChapter,
    selectChapter,
    reorderChapters
  }
})
