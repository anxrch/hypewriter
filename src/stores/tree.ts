// 프로젝트의 폴더/글 트리를 다루는 순수 함수들.
// 모든 함수는 입력을 변경하지 않고 새 배열을 돌려준다.

export interface ChapterNode {
  type: 'chapter'
  id: string
}

export interface FolderNode {
  type: 'folder'
  id: string
  name: string
  collapsed: boolean
  children: TreeNode[]
}

export type TreeNode = ChapterNode | FolderNode

export type DropTarget =
  | { kind: 'before' | 'after'; refId: string }
  | { kind: 'inside'; folderId: string } // 폴더 끝에 넣기
  | { kind: 'root-end' }

export function flattenChapterIds(tree: TreeNode[]): string[] {
  const out: string[] = []
  const walk = (nodes: TreeNode[]) => {
    for (const n of nodes) {
      if (n.type === 'chapter') out.push(n.id)
      else walk(n.children)
    }
  }
  walk(tree)
  return out
}

export function findNode(tree: TreeNode[], id: string): TreeNode | null {
  for (const n of tree) {
    if (n.id === id) return n
    if (n.type === 'folder') {
      const found = findNode(n.children, id)
      if (found) return found
    }
  }
  return null
}

/** 파일에서 읽은 트리를 chapters와 일치하도록 보정한다. */
export function normalizeTree(tree: TreeNode[] | undefined, chapterIds: string[]): TreeNode[] {
  const valid = new Set(chapterIds)
  const seen = new Set<string>()
  const seenFolders = new Set<string>()

  const clean = (nodes: unknown): TreeNode[] => {
    if (!Array.isArray(nodes)) return []
    const out: TreeNode[] = []
    for (const raw of nodes) {
      const n = raw as Partial<TreeNode> | null
      if (!n || typeof n.id !== 'string') continue
      if (n.type === 'chapter') {
        if (!valid.has(n.id) || seen.has(n.id)) continue
        seen.add(n.id)
        out.push({ type: 'chapter', id: n.id })
      } else if (n.type === 'folder') {
        const folder = n as Partial<FolderNode>
        // 같은 id의 폴더가 둘이면 이동·삭제가 엉키므로 뒤쪽에 새 id를 준다
        const id = seenFolders.has(n.id) || valid.has(n.id) ? crypto.randomUUID() : n.id
        seenFolders.add(id)
        out.push({
          type: 'folder',
          id,
          name: typeof folder.name === 'string' ? folder.name : '새 폴더',
          collapsed: folder.collapsed === true,
          children: clean(folder.children)
        })
      }
    }
    return out
  }

  const result = clean(tree)
  for (const id of chapterIds) {
    if (!seen.has(id)) {
      seen.add(id)
      result.push({ type: 'chapter', id })
    }
  }
  return result
}

export function insertNode(tree: TreeNode[], node: TreeNode, target: DropTarget): TreeNode[] {
  if (target.kind === 'root-end') return [...tree, node]

  const insert = (nodes: TreeNode[]): TreeNode[] => {
    const out: TreeNode[] = []
    for (const n of nodes) {
      if (target.kind === 'before' && n.id === target.refId) out.push(node)
      if (n.type === 'folder') {
        const children = insert(n.children)
        out.push(
          target.kind === 'inside' && n.id === target.folderId
            ? { ...n, children: [...children, node] }
            : children === n.children ? n : { ...n, children }
        )
      } else {
        out.push(n)
      }
      if (target.kind === 'after' && n.id === target.refId) out.push(node)
    }
    return out
  }
  return insert(tree)
}

export function removeNode(tree: TreeNode[], id: string): TreeNode[] {
  const out: TreeNode[] = []
  for (const n of tree) {
    if (n.id === id) continue
    out.push(n.type === 'folder' ? { ...n, children: removeNode(n.children, id) } : n)
  }
  return out
}

function targetId(target: DropTarget): string | null {
  if (target.kind === 'root-end') return null
  return target.kind === 'inside' ? target.folderId : target.refId
}

export function canMove(tree: TreeNode[], nodeId: string, target: DropTarget): boolean {
  const node = findNode(tree, nodeId)
  if (!node) return false
  const ref = targetId(target)
  if (ref === null) return true
  if (!findNode(tree, ref)) return false
  if (target.kind === 'inside' && findNode(tree, ref)?.type !== 'folder') return false
  // 폴더를 자기 자신이나 하위로 옮기는 것은 금지
  if (node.type === 'folder' && findNode([node], ref)) return false
  return true
}

export function moveNode(tree: TreeNode[], nodeId: string, target: DropTarget): TreeNode[] {
  if (!canMove(tree, nodeId, target)) return tree
  if (target.kind !== 'root-end' && target.kind !== 'inside' && target.refId === nodeId) return tree
  const node = findNode(tree, nodeId)!
  const next = insertNode(removeNode(tree, nodeId), node, target)
  // 제자리 이동이면 원래 트리를 그대로 돌려줘서 호출 쪽이 "변경 없음"을 알 수 있게 한다
  return JSON.stringify(next) === JSON.stringify(tree) ? tree : next
}

export function dissolveFolder(tree: TreeNode[], folderId: string): TreeNode[] {
  const out: TreeNode[] = []
  for (const n of tree) {
    if (n.type === 'folder') {
      if (n.id === folderId) out.push(...n.children)
      else out.push({ ...n, children: dissolveFolder(n.children, folderId) })
    } else {
      out.push(n)
    }
  }
  return out
}

export function updateFolder(
  tree: TreeNode[],
  folderId: string,
  patch: Partial<Pick<FolderNode, 'name' | 'collapsed'>>
): TreeNode[] {
  return tree.map(n => {
    if (n.type !== 'folder') return n
    if (n.id === folderId) return { ...n, ...patch }
    return { ...n, children: updateFolder(n.children, folderId, patch) }
  })
}

/** 드래그 중 마우스가 행의 어느 부분에 있는지로 놓을 위치를 정한다. */
export function dropPosition(
  nodeType: 'chapter' | 'folder',
  offsetY: number,
  height: number
): 'before' | 'after' | 'inside' {
  if (nodeType === 'chapter') return offsetY < height / 2 ? 'before' : 'after'
  if (offsetY < height * 0.25) return 'before'
  if (offsetY > height * 0.75) return 'after'
  return 'inside'
}
