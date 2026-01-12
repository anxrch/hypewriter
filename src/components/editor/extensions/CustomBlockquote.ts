import { Node, mergeAttributes } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'

export interface CustomBlockquoteOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customBlockquote: {
      setBlockquote: (type?: string) => ReturnType
      toggleBlockquote: (type?: string) => ReturnType
      unsetBlockquote: () => ReturnType
    }
  }
}

export const CustomBlockquote = Node.create<CustomBlockquoteOptions>({
  name: 'blockquote',

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
      type: {
        default: 'line',
        parseHTML: element => element.getAttribute('data-type') || 'line',
        renderHTML: attributes => ({
          'data-type': attributes.type,
          class: `blockquote blockquote-${attributes.type}`
        })
      }
    }
  },

  parseHTML() {
    return [
      { tag: 'blockquote' },
      { tag: 'div[data-type="bubble"]', getAttrs: el => {
        const position = (el as HTMLElement).getAttribute('data-position')
        return { type: position === 'right' ? 'bubble-right' : 'bubble-left' }
      }}
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['blockquote', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      'data-type': node.attrs.type,
      class: `blockquote blockquote-${node.attrs.type}`
    }), 0]
  },

  addCommands() {
    return {
      setBlockquote:
        (type = 'line') =>
        ({ state, dispatch, tr }) => {
          const { selection } = state
          const { from, to } = selection
          
          const selectedText = state.doc.textBetween(from, to, '')
          
          const blockquoteNode = this.type.create(
            { type },
            selectedText ? state.schema.text(selectedText) : null
          )
          
          if (dispatch) {
            tr.deleteSelection()
            tr.insert(tr.selection.from, blockquoteNode)
            
            const newPos = tr.selection.from - 1
            tr.setSelection(TextSelection.create(tr.doc, newPos))
            
            dispatch(tr)
          }
          
          return true
        },
      toggleBlockquote:
        (type = 'line') =>
        ({ state, dispatch, tr, commands }) => {
          const { $from } = state.selection
          
          // 이미 blockquote 안에 있으면 해제
          for (let depth = $from.depth; depth > 0; depth--) {
            if ($from.node(depth).type.name === 'blockquote') {
              return commands.unsetBlockquote()
            }
          }
          
          return commands.setBlockquote(type)
        },
      unsetBlockquote:
        () =>
        ({ state, dispatch, tr }) => {
          const { $from } = state.selection
          
          for (let depth = $from.depth; depth > 0; depth--) {
            const node = $from.node(depth)
            if (node.type.name === 'blockquote') {
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
      'Enter': ({ editor }) => {
        const { state } = editor
        const { $from } = state.selection
        
        for (let depth = $from.depth; depth > 0; depth--) {
          if ($from.node(depth).type.name === 'blockquote') {
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
      'Backspace': ({ editor }) => {
        const { state } = editor
        const { $from, empty } = state.selection
        
        if (!empty) return false
        
        for (let depth = $from.depth; depth > 0; depth--) {
          const node = $from.node(depth)
          if (node.type.name === 'blockquote' && node.textContent === '') {
            return editor.commands.unsetBlockquote()
          }
        }
        return false
      },
    }
  },
})
