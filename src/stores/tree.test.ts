import { test, expect } from 'vitest'
import {
  type TreeNode,
  type FolderNode,
  flattenChapterIds,
  findNode,
  normalizeTree,
  insertNode,
  removeNode,
  canMove,
  moveNode,
  dissolveFolder,
  updateFolder,
  dropPosition
} from './tree'

const c = (id: string): TreeNode => ({ type: 'chapter', id })
const f = (id: string, children: TreeNode[]): FolderNode => ({
  type: 'folder', id, name: id, collapsed: false, children
})

const T: TreeNode[] = [c('a'), f('F', [c('b'), f('G', [c('c')])]), c('d')]

test('flattenChapterIds: 깊이 우선', () => {
  expect(flattenChapterIds(T)).toEqual(['a', 'b', 'c', 'd'])
})

test('findNode: 하위 폴더까지 찾음', () => {
  expect(findNode(T, 'G')?.type).toBe('folder')
  expect(findNode(T, 'c')).toEqual(c('c'))
  expect(findNode(T, 'zz')).toBeNull()
})

test('normalizeTree: undefined면 모든 글을 루트에 순서대로', () => {
  expect(normalizeTree(undefined, ['x', 'y'])).toEqual([c('x'), c('y')])
})

test('normalizeTree: 없는 id 제거, 빠진 글은 루트 끝에', () => {
  expect(flattenChapterIds(normalizeTree(T, ['a', 'c', 'd', 'z']))).toEqual(['a', 'c', 'd', 'z'])
})

test('normalizeTree: 중복된 글 노드는 첫 번째만 남김', () => {
  expect(flattenChapterIds(normalizeTree([c('a'), f('F', [c('a')])], ['a']))).toEqual(['a'])
})

test('normalizeTree: 빈 폴더는 유지', () => {
  expect(normalizeTree([f('E', [])], [])).toEqual([f('E', [])])
})

test('insertNode before/after/inside/root-end', () => {
  expect(flattenChapterIds(insertNode(T, c('n'), { kind: 'before', refId: 'c' }))).toEqual(['a', 'b', 'n', 'c', 'd'])
  expect(flattenChapterIds(insertNode(T, c('n'), { kind: 'after', refId: 'G' }))).toEqual(['a', 'b', 'c', 'n', 'd'])
  expect(flattenChapterIds(insertNode(T, c('n'), { kind: 'inside', folderId: 'F' }))).toEqual(['a', 'b', 'c', 'n', 'd'])
  expect(flattenChapterIds(insertNode(T, c('n'), { kind: 'root-end' }))).toEqual(['a', 'b', 'c', 'd', 'n'])
})

test('removeNode: 폴더째 제거', () => {
  expect(flattenChapterIds(removeNode(T, 'G'))).toEqual(['a', 'b', 'd'])
  expect(flattenChapterIds(removeNode(T, 'a'))).toEqual(['b', 'c', 'd'])
})

test('moveNode: 글을 다른 폴더로', () => {
  expect(flattenChapterIds(moveNode(T, 'a', { kind: 'inside', folderId: 'G' }))).toEqual(['b', 'c', 'a', 'd'])
})

test('moveNode: 폴더째 이동', () => {
  expect(flattenChapterIds(moveNode(T, 'G', { kind: 'after', refId: 'd' }))).toEqual(['a', 'b', 'd', 'c'])
})

test('moveNode rejects cycle', () => {
  expect(canMove(T, 'F', { kind: 'inside', folderId: 'G' })).toBe(false)
  expect(canMove(T, 'F', { kind: 'inside', folderId: 'F' })).toBe(false)
  expect(canMove(T, 'F', { kind: 'before', refId: 'c' })).toBe(false)
  expect(canMove(T, 'a', { kind: 'inside', folderId: 'G' })).toBe(true)
  expect(moveNode(T, 'F', { kind: 'inside', folderId: 'G' })).toEqual(T)
})

test('moveNode onto itself', () => {
  expect(moveNode(T, 'b', { kind: 'before', refId: 'b' })).toEqual(T)
  expect(moveNode(T, 'b', { kind: 'after', refId: 'b' })).toEqual(T)
})

test('입력 트리를 변경하지 않음', () => {
  const snap = structuredClone(T)
  moveNode(T, 'a', { kind: 'root-end' })
  dissolveFolder(T, 'F')
  updateFolder(T, 'G', { collapsed: true })
  insertNode(T, c('n'), { kind: 'inside', folderId: 'G' })
  expect(T).toEqual(snap)
})

test('dissolveFolder: 자식을 폴더 자리에 꺼냄', () => {
  const r = dissolveFolder(T, 'F')
  expect(r.map(n => n.id)).toEqual(['a', 'b', 'G', 'd'])
  expect(flattenChapterIds(r)).toEqual(['a', 'b', 'c', 'd'])
})

test('dissolveFolder: 하위 폴더', () => {
  expect((dissolveFolder(T, 'G')[1] as FolderNode).children.map(n => n.id)).toEqual(['b', 'c'])
})

test('updateFolder', () => {
  const r = updateFolder(T, 'G', { collapsed: true, name: '둘' })
  expect((r[1] as FolderNode).children[1]).toMatchObject({ collapsed: true, name: '둘' })
})

test('dropPosition', () => {
  expect(dropPosition('chapter', 4, 20)).toBe('before')
  expect(dropPosition('chapter', 15, 20)).toBe('after')
  expect(dropPosition('folder', 3, 20)).toBe('before')
  expect(dropPosition('folder', 10, 20)).toBe('inside')
  expect(dropPosition('folder', 17, 20)).toBe('after')
})

test('normalizeTree: 중복된 폴더 id는 새 id로 바꾸고 내용은 유지', () => {
  const r = normalizeTree([f('F', [c('a')]), f('F', [c('b')])], ['a', 'b'])
  expect(r[0].id).toBe('F')
  expect(r[1].id).not.toBe('F')
  expect(flattenChapterIds(r)).toEqual(['a', 'b'])
  // 이동해도 글이 사라지지 않음
  expect(flattenChapterIds(moveNode(r, r[1].id, { kind: 'before', refId: 'F' }))).toEqual(['b', 'a'])
})

test('moveNode: 제자리 이동은 같은 트리 객체를 돌려줌', () => {
  expect(moveNode(T, 'b', { kind: 'before', refId: 'G' })).toBe(T)
  expect(moveNode(T, 'G', { kind: 'inside', folderId: 'F' })).toBe(T)
  expect(moveNode(T, 'd', { kind: 'root-end' })).toBe(T)
})
