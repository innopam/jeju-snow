// UI-001-05 알림 — 위험 이벤트 목업 데이터
export const ALERT_TYPES = {
  긴급: { bar: '#d92338', bg: '#ffe7e8', fg: '#d92338', icon: 'alert' },
  미조치: { bar: '#dc7200', bg: '#fff4d9', fg: '#dc7200', icon: 'warning' },
  상습: { bar: '#16a05d', bg: '#e5faed', fg: '#16a05d', icon: 'minor' },
}

export const ALERTS = [
  { id: 1, type: '긴급', title: '노면온도 급강하 -4.5℃', desc: '평화로 · 광령 (P-2) · 결빙 위험 상승', time: '09:28', unread: true },
  { id: 2, type: '긴급', title: '재결빙 위험 발생', desc: '5·16도로 · 교래 (K-16-2) · 제설제 잔류 18%', time: '09:15', unread: true },
  { id: 3, type: '미조치', title: '장기 미조치 6시간 경과', desc: '비자림로 · 송당 (V-2) · 제설 미작업', time: '08:57', unread: true },
  { id: 4, type: '상습', title: '상습 결빙 구간 재발', desc: '산록도로 · 안덕 (S-1) · 올겨울 4회째', time: '08:12', unread: false },
  { id: 5, type: '긴급', title: '블랙아이스 감지', desc: '1100도로 · 성판악 (K-12) · 노면 -3.8℃', time: '07:52', unread: false },
  { id: 6, type: '미조치', title: '작업 누락 의심', desc: '번영로 · 대천 (B-4) · 위험 발생 후 3h', time: '07:30', unread: false },
  { id: 7, type: '미조치', title: '제설제 살포 미흡', desc: '평화로 · 광령 (P-2) · 1회 살포 후 미재살포', time: '07:05', unread: false },
  { id: 8, type: '상습', title: '상습 결빙 구간 재발', desc: '남조로 · 수망 (N-3) · 올겨울 3회째', time: '06:40', unread: false },
]
