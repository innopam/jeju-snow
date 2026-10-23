// 아주 작은 전역 상태 저장소 — 페이지를 오가도 상태가 유지되도록 하고, 필요하면 브라우저 저장소에 보관한다.
import { useSyncExternalStore } from 'react'

const safe = (fn, fallback) => {
  try {
    return fn()
  } catch {
    return fallback
  }
}

export function createStore(key, initial, storage = 'local') {
  const area = () => (storage === 'session' ? window.sessionStorage : window.localStorage)
  let state = safe(() => {
    const raw = area().getItem(key)
    return raw ? JSON.parse(raw) : initial
  }, initial)
  const listeners = new Set()
  const store = {
    get: () => state,
    set(next) {
      state = typeof next === 'function' ? next(state) : next
      safe(() => area().setItem(key, JSON.stringify(state)))
      listeners.forEach((l) => l())
    },
    reset() {
      store.set(initial)
    },
    subscribe(l) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
  }
  return store
}

export function useStore(store) {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}
