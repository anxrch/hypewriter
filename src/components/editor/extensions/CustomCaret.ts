import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

/**
 * 커서를 직접 그린다.
 *
 * WebKit(WebKitGTK·macOS)은 문단의 두 번째 줄부터 커서 윗끝을 바로 윗줄 글자의
 * 아래끝에 맞춘다(CaretRectComputation.cpp, contentAreaLogicalTopAdjustedForPrecedingLineBox).
 * 줄 간격이 넓으면 커서가 줄 사이 여백까지 길게 늘어나 보인다. CSS로는 바꿀 수 없어서
 * 기본 커서는 투명하게 숨기고(caret-color: transparent, 입력기 후보창 위치는 그대로 따라감)
 * 글자 높이만큼의 막대를 에디터 뒤 층에 그린다.
 */
export const CustomCaret = Extension.create({
  name: 'customCaret',

  addOptions() {
    return {
      className: 'custom-caret',
    }
  },

  addProseMirrorPlugins() {
    const { className } = this.options

    return [
      new Plugin({
        key: new PluginKey('customCaret'),
        view(view) {
          const host = view.dom.parentElement
          const caret = document.createElement('div')
          caret.className = className
          caret.setAttribute('aria-hidden', 'true')
          host?.append(caret)

          let frame = 0
          const schedule = () => {
            cancelAnimationFrame(frame)
            frame = requestAnimationFrame(() => position(view, caret))
          }

          // 한글 조합 중에는 상태 갱신보다 DOM 선택이 먼저 움직이므로 selectionchange도 본다
          const onSelectionChange = () => {
            if (view.hasFocus()) schedule()
          }
          document.addEventListener('selectionchange', onSelectionChange)
          view.dom.addEventListener('focus', schedule)
          view.dom.addEventListener('blur', schedule)

          const resizeObserver = new ResizeObserver(schedule)
          resizeObserver.observe(view.dom)
          schedule()

          return {
            update: schedule,
            destroy() {
              cancelAnimationFrame(frame)
              document.removeEventListener('selectionchange', onSelectionChange)
              view.dom.removeEventListener('focus', schedule)
              view.dom.removeEventListener('blur', schedule)
              resizeObserver.disconnect()
              caret.remove()
            },
          }
        },
      }),
    ]
  },
})

/** 글자 높이로 볼 상자 크기 (글꼴 크기 대비) */
const GLYPH_EM = 1.2

/**
 * 위치 계산으로 얻은 상자에서 실제로 그릴 커서의 top/height.
 * 보통은 글자 상자 그대로지만, 빈 문단처럼 줄 높이 전체가 오면 글자 높이로 줄여 가운데에 둔다.
 * (글꼴 크기의 1.5배를 넘으면 줄 간격 여백이 섞인 것으로 본다)
 */
export function caretBox(
  rect: { top: number; bottom: number },
  fontSize: number
): { top: number; height: number } {
  const glyph = fontSize * GLYPH_EM
  const height = rect.bottom - rect.top
  if (height > 0 && height <= fontSize * 1.5) {
    return { top: rect.top, height }
  }
  const mid = height > 0 ? (rect.top + rect.bottom) / 2 : rect.top + glyph / 2
  return { top: mid - glyph / 2, height: glyph }
}

/** 조합 중이면 DOM 선택 위치가 가장 정확하다 */
function domCaretRect(): { top: number; bottom: number; left: number } | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  const range = sel.getRangeAt(0)
  if (!range.collapsed) return null
  const rects = range.getClientRects()
  const r = rects[rects.length - 1]
  if (!r || (r.height === 0 && r.top === 0 && r.left === 0)) return null
  return { top: r.top, bottom: r.bottom, left: r.left }
}

function position(view: EditorView, caret: HTMLElement) {
  const host = caret.parentElement
  const { selection } = view.state
  if (!host || !view.hasFocus() || !selection.empty || !view.editable) {
    caret.style.display = 'none'
    return
  }

  let rect: { top: number; bottom: number; left: number } | null = view.composing ? domCaretRect() : null
  if (!rect) {
    try {
      rect = view.coordsAtPos(selection.head)
    } catch {
      caret.style.display = 'none'
      return
    }
  }

  // 커서가 놓인 곳의 글꼴 크기 (제목 등은 크다)
  const at = view.domAtPos(selection.head)
  const el = at.node instanceof HTMLElement ? at.node : at.node.parentElement
  const fontSize = (el && parseFloat(getComputedStyle(el).fontSize)) || 16

  const box = caretBox(rect, fontSize)
  const hostRect = host.getBoundingClientRect()

  caret.style.display = ''
  caret.style.top = `${box.top - hostRect.top}px`
  caret.style.left = `${rect.left - hostRect.left}px`
  caret.style.height = `${box.height}px`

  // 움직이거나 입력하는 동안은 깜빡이지 않게 애니메이션을 처음부터 다시 시작
  caret.classList.remove('blink')
  void caret.offsetWidth
  caret.classList.add('blink')
}
