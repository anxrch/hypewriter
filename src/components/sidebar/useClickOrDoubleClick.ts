/**
 * 한 요소에서 클릭과 더블클릭을 구분한다.
 * 클릭 동작은 delay만큼 미뤄 두었다가 더블클릭이 오면 취소한다.
 * (폴더 행: 클릭 = 접기/펴기, 더블클릭 = 이름 바꾸기 — 이름을 바꾸려다 폴더가 깜빡이지 않게)
 */
export function useClickOrDoubleClick(onClick: () => void, onDouble: () => void, delay = 200) {
  let timer: ReturnType<typeof setTimeout> | null = null

  function cancel() {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  return {
    onClick(e: MouseEvent) {
      cancel()
      if (e.detail > 1) return
      timer = setTimeout(() => {
        timer = null
        onClick()
      }, delay)
    },
    onDoubleClick() {
      cancel()
      onDouble()
    }
  }
}
