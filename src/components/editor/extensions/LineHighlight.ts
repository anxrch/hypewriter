import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

/**
 * 커서가 있는 "화면상의 한 줄"만 하이라이트한다.
 *
 * 문단 전체를 칠하던 노드 데코레이션 대신, 에디터 DOM 뒤에 깔린 오버레이 하나를
 * 커서가 놓인 시각적 줄(line box) 위치로 옮긴다. 줄 위치는 커서가 속한 블록의
 * line-height 격자에 커서 좌표를 맞춰 계산하므로, 자동 줄바꿈된 줄에서도 정확히
 * 한 줄만 칠해진다.
 */
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
        view(view) {
          const host = view.dom.parentElement
          const overlay = document.createElement('div')
          overlay.className = className
          overlay.setAttribute('aria-hidden', 'true')
          host?.prepend(overlay)

          let frame = 0
          const schedule = () => {
            cancelAnimationFrame(frame)
            frame = requestAnimationFrame(() => position(view, overlay))
          }

          const resizeObserver = new ResizeObserver(schedule)
          resizeObserver.observe(view.dom)
          schedule()

          return {
            update: schedule,
            destroy() {
              cancelAnimationFrame(frame)
              resizeObserver.disconnect()
              overlay.remove()
            },
          }
        },
      }),
    ]
  },
})

function position(view: EditorView, overlay: HTMLElement) {
  const host = overlay.parentElement
  if (!host) return

  const { $head } = view.state.selection

  // 커서가 속한 가장 안쪽 텍스트블록(paragraph, heading 등)의 DOM
  let blockEl: HTMLElement | null = null
  for (let depth = $head.depth; depth > 0; depth--) {
    if ($head.node(depth).isTextblock) {
      const dom = view.nodeDOM($head.before(depth))
      if (dom instanceof HTMLElement) blockEl = dom
      break
    }
  }

  let caret: { top: number; bottom: number }
  try {
    caret = view.coordsAtPos($head.pos)
  } catch {
    overlay.style.display = 'none'
    return
  }

  const hostRect = host.getBoundingClientRect()
  const editorRect = view.dom.getBoundingClientRect()

  let top = caret.top
  let height = caret.bottom - caret.top

  if (blockEl) {
    const style = getComputedStyle(blockEl)
    const lineHeight = parseFloat(style.lineHeight)
    if (Number.isFinite(lineHeight) && lineHeight > 0) {
      const blockRect = blockEl.getBoundingClientRect()
      const contentTop =
        blockRect.top + parseFloat(style.borderTopWidth) + parseFloat(style.paddingTop)
      const caretMid = (caret.top + caret.bottom) / 2
      const lineIndex = Math.max(0, Math.floor((caretMid - contentTop) / lineHeight))
      top = contentTop + lineIndex * lineHeight
      height = lineHeight
    }
  }

  overlay.style.display = ''
  overlay.style.top = `${top - hostRect.top}px`
  overlay.style.left = `${editorRect.left - hostRect.left}px`
  overlay.style.width = `${editorRect.width}px`
  overlay.style.height = `${height}px`
}
