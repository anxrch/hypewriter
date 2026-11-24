import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'
import {
  type TreeNode,
  type DropTarget,
  flattenChapterIds,
  findNode,
  normalizeTree,
  insertNode,
  removeNode,
  moveNode,
  dissolveFolder,
  updateFolder
} from './tree'

export const PROJECT_VERSION = '1.1'

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
  /** 폴더/글 배치. 글 순서의 유일한 기준이며 chapters는 이 순서로 맞춰진다. */
  tree: TreeNode[]
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

  /** 트리를 펼친 순서의 글 목록 (chapters와 같은 순서로 유지된다) */
  const orderedChapters = computed<Chapter[]>(() => {
    const project = currentProject.value
    if (!project) return []
    const byId = new Map(project.chapters.map(c => [c.id, c]))
    return flattenChapterIds(project.tree)
      .map(id => byId.get(id))
      .filter((c): c is Chapter => !!c)
  })

  /** 트리를 바꾸고 chapters 배열을 펼친 순서로 맞춘다. */
  function setTree(next: TreeNode[], { dirty = true }: { dirty?: boolean } = {}) {
    const project = currentProject.value
    if (!project) return
    project.tree = next
    const order = new Map(flattenChapterIds(next).map((id, i) => [id, i]))
    project.chapters.sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity))
    if (dirty) isDirty.value = true
  }

  function generateId(): string {
    return crypto.randomUUID()
  }

  function createEmptyProject(title: string = '새 프로젝트'): Project {
    const now = new Date().toISOString()
    return {
      version: PROJECT_VERSION,
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
      chapters: [],
      tree: []
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
        project.chapters ??= []
        project.tree = normalizeTree(project.tree, project.chapters.map(c => c.id))
        currentProject.value = project
        setTree(project.tree, { dirty: false })
        projectPath.value = path
        isDirty.value = false

        // Select first chapter if exists
        currentChapterId.value = project.chapters.length > 0 ? project.chapters[0].id : null
      } catch (error) {
        console.error('Failed to open project:', error)
      }
    }
  }

  async function saveProject() {
    if (!currentProject.value || !projectPath.value) return

    currentProject.value.version = PROJECT_VERSION
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

  function addChapter(title: string = '새 챕터', folderId?: string) {
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
    const target: DropTarget = folderId ? { kind: 'inside', folderId } : { kind: 'root-end' }
    setTree(insertNode(currentProject.value.tree, { type: 'chapter', id: chapter.id }, target))
    currentChapterId.value = chapter.id
  }

  function addFolder(name: string = '새 폴더', parentId?: string): string {
    const id = generateId()
    if (!currentProject.value) return id
    const target: DropTarget = parentId ? { kind: 'inside', folderId: parentId } : { kind: 'root-end' }
    setTree(insertNode(
      currentProject.value.tree,
      { type: 'folder', id, name, collapsed: false, children: [] },
      target
    ))
    return id
  }

  function renameFolder(id: string, name: string) {
    if (!currentProject.value) return
    setTree(updateFolder(currentProject.value.tree, id, { name }))
  }

  function toggleFolder(id: string) {
    const project = currentProject.value
    if (!project) return
    const node = findNode(project.tree, id)
    if (node?.type !== 'folder') return
    setTree(updateFolder(project.tree, id, { collapsed: !node.collapsed }), { dirty: false })
  }

  function deleteFolder(id: string) {
    if (!currentProject.value) return
    setTree(dissolveFolder(currentProject.value.tree, id))
  }

  function moveItem(nodeId: string, target: DropTarget) {
    if (!currentProject.value) return
    const before = currentProject.value.tree
    let next = moveNode(before, nodeId, target)
    if (next === before) return
    // 접힌 폴더에 넣으면 펼쳐서 옮긴 항목이 보이게 한다
    if (target.kind === 'inside') next = updateFolder(next, target.folderId, { collapsed: false })
    setTree(next)
  }

  function deleteChapter(id: string) {
    if (!currentProject.value) return

    const index = currentProject.value.chapters.findIndex(c => c.id === id)
    if (index !== -1) {
      currentProject.value.chapters.splice(index, 1)
      setTree(removeNode(currentProject.value.tree, id))

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

  return {
    currentProject,
    currentChapterId,
    currentChapter,
    orderedChapters,
    projectPath,
    isDirty,
    createProject,
    openProject,
    saveProject,
    addChapter,
    deleteChapter,
    updateChapter,
    selectChapter,
    addFolder,
    renameFolder,
    toggleFolder,
    deleteFolder,
    moveItem
  }
})
