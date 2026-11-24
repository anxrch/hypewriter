import { test, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: vi.fn() }))

import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { useProjectStore, type Chapter, type Project } from './project'
import { flattenChapterIds, type TreeNode } from './tree'

const invokeMock = vi.mocked(invoke)
const openMock = vi.mocked(open)

const ch = (id: string): Chapter => ({
  id, title: id, content: '', footnotes: [], createdAt: '', modifiedAt: ''
})

function makeProject(chapters: Chapter[], tree?: TreeNode[]): Project {
  const p: Project = {
    version: '1.1',
    metadata: { title: 't', author: '', created: '', modified: '' },
    settings: { font: 'Pretendard', fontSize: 16, lineHeight: 1.8 },
    chapters,
    tree: tree ?? chapters.map(c => ({ type: 'chapter' as const, id: c.id }))
  }
  return p
}

const folder = (id: string, children: TreeNode[]): TreeNode => ({
  type: 'folder', id, name: id, collapsed: false, children
})

const lastOf = <T,>(xs: T[]): T => xs[xs.length - 1]

let store: ReturnType<typeof useProjectStore>

beforeEach(() => {
  setActivePinia(createPinia())
  invokeMock.mockReset()
  openMock.mockReset()
  store = useProjectStore()
})

test('opens 1.0 file', async () => {
  openMock.mockResolvedValue('/p.hype')
  const legacy: Record<string, unknown> = { ...makeProject([ch('x'), ch('y')]), version: '1.0' }
  delete legacy.tree
  invokeMock.mockResolvedValue(JSON.stringify(legacy))
  await store.openProject()
  expect(store.currentProject!.tree).toEqual([
    { type: 'chapter', id: 'x' },
    { type: 'chapter', id: 'y' }
  ])
  expect(store.currentChapterId).toBe('x')
})

test('opening a file whose tree order differs reorders chapters and selects first in tree', async () => {
  openMock.mockResolvedValue('/p.hype')
  const p = makeProject([ch('x'), ch('y')], [folder('F', [{ type: 'chapter', id: 'y' }]), { type: 'chapter', id: 'x' }])
  invokeMock.mockResolvedValue(JSON.stringify(p))
  await store.openProject()
  expect(store.currentProject!.chapters.map(c => c.id)).toEqual(['y', 'x'])
  expect(store.currentChapterId).toBe('y')
})

test('addChapter into folder keeps chapters synced to tree order', () => {
  store.currentProject = makeProject([ch('a'), ch('b')], [
    { type: 'chapter', id: 'a' }, folder('F', []), { type: 'chapter', id: 'b' }
  ])
  store.addChapter('n', 'F')
  expect(store.currentProject!.chapters.map(c => c.title)).toEqual(['a', 'n', 'b'])
  expect(store.orderedChapters.map(c => c.title)).toEqual(['a', 'n', 'b'])
  expect(store.isDirty).toBe(true)
})

test('addChapter without folder goes to root end', () => {
  store.currentProject = makeProject([ch('a')], [folder('F', [{ type: 'chapter', id: 'a' }])])
  store.addChapter('n')
  const last = lastOf(store.currentProject!.tree)
  expect(last.type).toBe('chapter')
  expect(store.currentChapterId).toBe(last.id)
})

test('addFolder returns id and creates empty folder at root end', () => {
  store.currentProject = makeProject([ch('a')])
  const id = store.addFolder()
  expect(lastOf(store.currentProject!.tree)).toEqual({
    type: 'folder', id, name: '새 폴더', collapsed: false, children: []
  })
})

test('renameFolder / toggleFolder', () => {
  store.currentProject = makeProject([], [folder('F', [])])
  store.renameFolder('F', '1부')
  expect(store.currentProject!.tree[0]).toMatchObject({ name: '1부' })
  store.isDirty = false
  store.toggleFolder('F')
  expect(store.currentProject!.tree[0]).toMatchObject({ collapsed: true })
  expect(store.isDirty).toBe(false)
})

test('delete selected chapter in folder', () => {
  store.currentProject = makeProject([ch('a'), ch('b'), ch('c'), ch('d')], [
    { type: 'chapter', id: 'a' },
    folder('F', [{ type: 'chapter', id: 'b' }, { type: 'chapter', id: 'c' }]),
    { type: 'chapter', id: 'd' }
  ])
  store.selectChapter('c')
  store.deleteChapter('c')
  expect(store.currentChapterId).toBe('b')
  expect(flattenChapterIds(store.currentProject!.tree)).toEqual(['a', 'b', 'd'])
})

test('deleteFolder keeps chapters', () => {
  store.currentProject = makeProject([ch('a'), ch('b'), ch('c'), ch('d')], [
    { type: 'chapter', id: 'a' },
    folder('F', [{ type: 'chapter', id: 'b' }, { type: 'chapter', id: 'c' }]),
    { type: 'chapter', id: 'd' }
  ])
  store.deleteFolder('F')
  expect(store.currentProject!.chapters.map(c => c.id)).toEqual(['a', 'b', 'c', 'd'])
  expect(store.currentProject!.tree.every(n => n.type === 'chapter')).toBe(true)
})

test('moveItem reorders chapters', () => {
  store.currentProject = makeProject([ch('a'), ch('b')], [
    { type: 'chapter', id: 'a' }, folder('F', [{ type: 'chapter', id: 'b' }])
  ])
  store.moveItem('a', { kind: 'inside', folderId: 'F' })
  expect(store.currentProject!.chapters.map(c => c.id)).toEqual(['b', 'a'])
  expect(store.isDirty).toBe(true)
})

test('saveProject writes version 1.1 with tree', async () => {
  store.currentProject = { ...makeProject([ch('a')]), version: '1.0' }
  store.projectPath = '/p.hype'
  await store.saveProject()
  const args = lastOf(invokeMock.mock.calls)[1] as { content: string }
  const json = JSON.parse(args.content)
  expect(json.version).toBe('1.1')
  expect(json.tree).toEqual([{ type: 'chapter', id: 'a' }])
})

test('moveItem to the same spot does not mark dirty', () => {
  store.currentProject = makeProject([ch('a'), ch('b')])
  store.isDirty = false
  store.moveItem('a', { kind: 'before', refId: 'b' })
  expect(store.isDirty).toBe(false)
})

test('moveItem into a collapsed folder expands it', () => {
  store.currentProject = makeProject([ch('a')], [
    { type: 'chapter', id: 'a' },
    { type: 'folder', id: 'F', name: 'F', collapsed: true, children: [] }
  ])
  store.moveItem('a', { kind: 'inside', folderId: 'F' })
  expect(store.currentProject!.tree[0]).toMatchObject({ id: 'F', collapsed: false })
})
