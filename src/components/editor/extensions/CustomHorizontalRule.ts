import { Node, mergeAttributes } from '@tiptap/core'

export interface HorizontalRuleOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customHorizontalRule: {
      setHorizontalRule: (type?: string) => ReturnType
    }
  }
}

export const CustomHorizontalRule = Node.create<HorizontalRuleOptions>({
  name: 'horizontalRule',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  group: 'block',

  parseHTML() {
    return [{ tag: 'hr' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['hr', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      'data-type': node.attrs.type || 'solid'
    })]
  },

  addAttributes() {
    return {
      type: {
        default: 'solid',
        parseHTML: element => element.getAttribute('data-type') || 'solid',
        renderHTML: attributes => ({
          'data-type': attributes.type
        })
      }
    }
  },

  addCommands() {
    return {
      setHorizontalRule:
        (type = 'solid') =>
        ({ chain, state }) => {
          const { $to: $originTo } = state.selection

          const currentChain = chain()

          if ($originTo.parentOffset === 0) {
            currentChain.insertContentAt(Math.max($originTo.pos - 2, 0), {
              type: this.name,
              attrs: { type }
            })
          } else {
            currentChain.insertContent({ type: this.name, attrs: { type } })
          }

          return currentChain
            .command(({ tr, dispatch }) => {
              if (dispatch) {
                const { $to } = tr.selection
                const posAfter = $to.end()

                if ($to.nodeAfter) {
                  if ($to.nodeAfter.isTextblock) {
                    tr.setSelection(
                      // @ts-ignore
                      state.selection.constructor.near(tr.doc.resolve(posAfter))
                    )
                  }
                } else {
                  const node = $to.parent.type.contentMatch.defaultType?.create()

                  if (node) {
                    tr.insert(posAfter, node)
                    tr.setSelection(
                      // @ts-ignore
                      state.selection.constructor.near(tr.doc.resolve(posAfter + 1))
                    )
                  }
                }

                tr.scrollIntoView()
              }

              return true
            })
            .run()
        },
    }
  },
})
