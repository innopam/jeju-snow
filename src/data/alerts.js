// UI-SIRS-001-05 알림 — 위험 이벤트 목업 데이터와 상태 저장소
import { createStore } from '../store.js'

export const ALERT_TYPES = {
  긴급: { bar: '#d92338', bg: '#ffe7e8', fg: '#d92338', icon: 'alert' },
  미조치: { bar: '#dc7200', bg: '#fff4d9', fg: '#dc7200', icon: 'warning' },
  상습: { bar: '#16a05d', bg: '#e5faed', fg: '#16a05d', icon: 'minor' },
}

// refreeze: 재결빙 위험 구간 알림 — 종합 현황 '재결빙 위험' 목록 보기에서 모아 보여 준다
const INITIAL = [
  { id: 9, type: '긴급', title: '재결빙 위험 · 10:40 예상', desc: '1100도로 · 성판악 (K-12) · 노면 -2.4℃ · 제설제 잔류 12%', time: '09:40', seg: 'K-12', unread: true, refreeze: true },
  { id: 1, type: '긴급', title: '노면온도 급강하 -4.5℃', desc: '평화로 · 광령 (P-2) · 결빙 위험 상승', time: '09:28', seg: 'P-2', unread: true },
  { id: 2, type: '긴급', title: '재결빙 위험 발생', desc: '5·16도로 · 교래 (K-16-2) · 제설제 잔류 18%', time: '09:15', seg: 'K-16-2', unread: true, refreeze: true },
  { id: 10, type: '긴급', title: '재결빙 위험 · 10:55 예상', desc: '평화로 · 광령 (P-2) · 노면 -2.1℃ · 제설제 잔류 19%', time: '09:02', seg: 'P-2', unread: true, refreeze: true },
  { id: 3, type: '미조치', title: '장기 미조치 6시간 경과', desc: '비자림로 · 송당 (V-2) · 제설 미작업', time: '08:57', seg: 'V-2', unread: true },
  { id: 11, type: '긴급', title: '재결빙 위험 · 11:10 예상', desc: '번영로 · 대천 (B-4) · 노면 -0.9℃ · 제설제 잔류 24%', time: '08:30', seg: 'B-4', unread: false, refreeze: true },
  { id: 12, type: '긴급', title: '재결빙 위험 · 11:30 예상', desc: '남조로 · 수망 (N-3) · 노면 -0.6℃ · 제설제 잔류 26%', time: '08:20', seg: 'N-3', unread: false, refreeze: true },
  { id: 4, type: '상습', title: '상습 결빙 구간 재발', desc: '산록도로 · 안덕 (S-1) · 올겨울 4회째', time: '08:12', seg: 'S-1', unread: false },
  { id: 5, type: '긴급', title: '블랙아이스 감지', desc: '1100도로 · 성판악 (K-12) · 노면 -3.8℃', time: '07:52', seg: 'K-12', unread: false },
  { id: 6, type: '미조치', title: '작업 누락 의심', desc: '번영로 · 대천 (B-4) · 위험 발생 후 3h', time: '07:30', seg: 'B-4', unread: false },
  { id: 7, type: '미조치', title: '제설제 살포 미흡', desc: '평화로 · 광령 (P-2) · 1회 살포 후 미재살포', time: '07:05', seg: 'P-2', unread: false },
  { id: 8, type: '상습', title: '상습 결빙 구간 재발', desc: '남조로 · 수망 (N-3) · 올겨울 3회째', time: '06:40', seg: 'N-3', unread: false },
]

// 실시간으로 들어올 신규 이벤트 (스마트빌리지 인프라 수신 → 알림 조건 충족, UC-EVT-001 기본 흐름 1)
export const INCOMING = [
  { type: '긴급', title: '재결빙 위험 발생', desc: '번영로 · 대천 (B-4) · 노면 -1.8℃ 하강', seg: 'B-4' },
  { type: '긴급', title: '블랙아이스 감지', desc: '1100도로 · 성판악 (K-12) · 마찰계수 0.28', seg: 'K-12' },
  { type: '미조치', title: '장기 미조치 3시간 경과', desc: '번영로 · 대천 (B-4) · 제설 미작업', seg: 'B-4' },
]

export const alertStore = createStore('jeju-snow.alerts.v4', INITIAL)

export function pushIncoming(i) {
  const src = INCOMING[i % INCOMING.length]
  const time = new Date().toTimeString().slice(0, 5)
  alertStore.set((list) =>
    list.some((a) => a.title === src.title && a.desc === src.desc) ? list : [{ ...src, id: Date.now(), time, unread: true, fresh: true }, ...list],
  )
}
