import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const LineHighlight = Extension.create({
  name: 'lineHighlight',

  addOptions() {
    return {
      className: 'line-highlight',
    }
  },

  addProseMirrorPlugins() {
    const { className } = this.options

    return [
      new Plugin({
        key: new PluginKey('lineHighlight'),
        props: {
          decorations(state) {
            const { doc, selection } = state
            const { $head } = selection

            // 현재 커서가 있는 블록(paragraph, heading 등) 찾기
            const resolved = doc.resolve($head.pos)
            let nodeStart = $head.pos
            let nodeEnd = $head.pos

            // 현재 위치에서 가장 가까운 블록 노드 찾기
            for (let depth = resolved.depth; depth > 0; depth--) {
              const node = resolved.node(depth)
              if (node.isBlock) {
                nodeStart = resolved.start(depth)
                nodeEnd = resolved.end(depth)
                break
              }
            }

            // 데코레이션 생성
            const decoration = Decoration.node(nodeStart - 1, nodeEnd + 1, {
              class: className,
            })

            return DecorationSet.create(doc, [decoration])
          },
        },
      }),
    ]
  },
})
