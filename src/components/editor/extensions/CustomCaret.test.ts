import { test, expect } from 'vitest'
import { caretBox } from './CustomCaret'

// 글꼴 16px, 줄 높이 28.8px(1.8)
const FONT = 16
const LINE = 28.8

test('글자 상자 높이를 그대로 쓴다 (줄 간격 여백은 포함하지 않음)', () => {
  expect(caretBox({ top: 100, bottom: 119 }, FONT)).toEqual({ top: 100, height: 19 })
})

test('줄 높이만큼 큰 상자(빈 문단 등)는 글자 높이로 줄여 가운데에 둔다', () => {
  const box = caretBox({ top: 100, bottom: 100 + LINE }, FONT)
  expect(box.height).toBeCloseTo(FONT * 1.2)
  expect(box.top + box.height / 2).toBeCloseTo(100 + LINE / 2)
})

test('높이 0인 상자는 글자 높이로 만든다', () => {
  const box = caretBox({ top: 100, bottom: 100 }, FONT)
  expect(box.height).toBeCloseTo(FONT * 1.2)
})
