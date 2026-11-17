// 아주 작은 전역 상태 저장소 — 페이지를 오가도 상태가 유지되도록 하고, 필요하면 브라우저 저장소에 보관한다.
import { useSyncExternalStore } from 'react'

const safe = <T,>(fn: () => T, fallback?: T): T | undefined => {
  try {
    return fn()
  } catch {
    return fallback
  }
}

export interface Store<T> {
  get: () => T
  set: (next: T | ((prev: T) => T)) => void
  reset: () => void
  subscribe: (listener: () => void) => () => void
}

export function createStore<T>(key: string, initial: T, storage: 'local' | 'session' = 'local'): Store<T> {
  const area = () => (storage === 'session' ? window.sessionStorage : window.localStorage)
  let state: T = safe<T>(() => {
    const raw = area().getItem(key)
    return raw ? (JSON.parse(raw) as T) : initial
  }, initial) as T
  const listeners = new Set<() => void>()
  const store: Store<T> = {
    get: () => state,
    set(next) {
      state = typeof next === 'function' ? (next as (prev: T) => T)(state) : next
      safe(() => area().setItem(key, JSON.stringify(state)))
      listeners.forEach((l) => l())
    },
    reset() {
      store.set(initial)
    },
    subscribe(l) {
      listeners.add(l)
      return () => {
        listeners.delete(l)
      }
    },
  }
  return store
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}
