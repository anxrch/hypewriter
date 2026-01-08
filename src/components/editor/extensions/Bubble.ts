import { Node, mergeAttributes } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'

export interface BubbleOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    bubble: {
      insertBubble: (position: 'left' | 'right') => ReturnType
      removeBubble: () => ReturnType
    }
  }
}

export const Bubble = Node.create<BubbleOptions>({
  name: 'bubble',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  group: 'block',

  content: 'text*',

  defining: true,

  addAttributes() {
    return {
      position: {
        default: 'left',
        parseHTML: element => element.getAttribute('data-position') || 'left',
        renderHTML: attributes => ({
          'data-position': attributes.position
        })
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="bubble"]',
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      'data-type': 'bubble',
      'data-position': node.attrs.position,
      class: `bubble bubble-${node.attrs.position}`
    }), 0]
  },

  addCommands() {
    return {
      insertBubble:
        (position) =>
        ({ state, dispatch, tr }) => {
          const { selection } = state
          const { from, to } = selection
          
          // 선택된 텍스트 가져오기
          const selectedText = state.doc.textBetween(from, to, '')
          
          // 말풍선 노드 생성
          const bubbleNode = this.type.create(
            { position },
            selectedText ? state.schema.text(selectedText) : null
          )
          
          if (dispatch) {
            // 선택 영역 삭제 후 말풍선 삽입
            tr.deleteSelection()
            tr.insert(tr.selection.from, bubbleNode)
            
            // 커서를 말풍선 안으로 이동
            const newPos = tr.selection.from - 1
            tr.setSelection(TextSelection.create(tr.doc, newPos))
            
            dispatch(tr)
          }
          
          return true
        },
      removeBubble:
        () =>
        ({ state, dispatch, tr, commands }) => {
          const { selection } = state
          const { $from } = selection
          
          // 현재 위치에서 bubble 노드 찾기
          for (let depth = $from.depth; depth > 0; depth--) {
            const node = $from.node(depth)
            if (node.type.name === 'bubble') {
              const start = $from.before(depth)
              const end = $from.after(depth)
              const content = node.textContent
              
              if (dispatch) {
                tr.delete(start, end)
                if (content) {
                  tr.insert(start, state.schema.nodes.paragraph.create(null, state.schema.text(content)))
                }
                dispatch(tr)
              }
              return true
            }
          }
          return false
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      // Enter로 말풍선 빠져나가기
      'Enter': ({ editor }) => {
        const { state } = editor
        const { $from } = state.selection
        
        for (let depth = $from.depth; depth > 0; depth--) {
          if ($from.node(depth).type.name === 'bubble') {
            // 말풍선 뒤에 새 문단 삽입
            return editor.chain()
              .command(({ tr, dispatch }) => {
                if (dispatch) {
                  const after = $from.after(depth)
                  tr.insert(after, state.schema.nodes.paragraph.create())
                  tr.setSelection(TextSelection.create(tr.doc, after + 1))
                  dispatch(tr)
                }
                return true
              })
              .run()
          }
        }
        return false
      },
      // Backspace로 빈 말풍선 삭제
      'Backspace': ({ editor }) => {
        const { state } = editor
        const { $from, empty } = state.selection
        
        if (!empty) return false
        
        for (let depth = $from.depth; depth > 0; depth--) {
          const node = $from.node(depth)
          if (node.type.name === 'bubble' && node.textContent === '') {
            return editor.commands.removeBubble()
          }
        }
        return false
      },
    }
  },
})
