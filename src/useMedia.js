// 반응형 브레이크포인트 — 데스크톱 ≥1280 · 태블릿 768~1279 · 모바일 <768
import { useSyncExternalStore } from 'react'

export const BP = { mobile: '(max-width: 767px)', tablet: '(max-width: 1279px)', narrow: '(max-width: 1099px)' }

export function useMedia(query) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
