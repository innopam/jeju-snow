// 제설 구간 · 행정구역 목업 데이터 (좌표는 대시보드 지도 콘텐츠 좌표)

export const STATE_COLOR = { 미작업: '#f93c65', '제설 필요': '#ff8a3d', 진행중: '#fcbe2d', 완료: '#00b69b' }
export const RISK_COLOR = { 높음: '#e7000b', 보통: '#dc7200', 낮음: '#16a05d' }

// UC-GIS-009 제설 작업 상태 및 재결빙 위험 구간 / 구간 정보 레이어
export const SEGMENTS = [
  { code: 'K-12', road: '1100도로', place: '성판악', x: 428, y: 539, state: '진행중', risk: '높음', refreeze: true, blackice: true, jur: '도청', region: '제주시' },
  { code: 'K-16-2', road: '5·16도로', place: '교래', x: 685, y: 459, state: '제설 필요', risk: '높음', refreeze: true, jur: '도청', region: '조천읍' },
  { code: 'P-2', road: '평화로', place: '광령', x: 320, y: 389, state: '미작업', risk: '높음', blackice: true, jur: '도청', region: '애월읍' },
  { code: 'B-4', road: '번영로', place: '대천', x: 720, y: 289, state: '미작업', risk: '보통', refreeze: true, jur: '도청', region: '조천읍' },
  { code: 'V-2', road: '비자림로', place: '송당', x: 880, y: 350, state: '미작업', risk: '보통', jur: '제주시', region: '구좌읍' },
  { code: 'S-1', road: '산록도로', place: '안덕', x: 230, y: 579, state: '완료', risk: '낮음', habitual: true, jur: '서귀포시', region: '안덕면' },
  { code: 'N-3', road: '남조로', place: '수망', x: 650, y: 629, state: '진행중', risk: '보통', habitual: true, jur: '서귀포시', region: '남원읍' },
  { code: 'H-1', road: '한창로', place: '한경', x: 120, y: 520, state: '완료', risk: '낮음', habitual: true, jur: '제주시', region: '한경면' },
]
export const segName = (s) => `${s.road} · ${s.place} (${s.code})`

// 주요 교통량 축 / 제설 우선노선 라벨 위치
export const ROUTE_LABELS = [
  { name: '평화로', x: 180, y: 640, traffic: true },
  { name: '1100도로', x: 400, y: 575, priority: true },
  { name: '5·16도로', x: 628, y: 590, priority: true, traffic: true },
  { name: '번영로', x: 830, y: 355, traffic: true },
  { name: '산록도로', x: 200, y: 562, priority: true },
]

// 행정구역 경로(지도 가운데 기준) — 읍면동 대표 좌표
export const REGIONS = [
  { city: '제주시', name: '제주시 동지역', x: 545, y: 267 },
  { city: '제주시', name: '애월읍', x: 285, y: 359 },
  { city: '제주시', name: '한림읍', x: 120, y: 450 },
  { city: '제주시', name: '한경면', x: 15, y: 589 },
  { city: '제주시', name: '조천읍', x: 760, y: 249 },
  { city: '제주시', name: '구좌읍', x: 960, y: 319 },
  { city: '서귀포시', name: '대정읍', x: 80, y: 774 },
  { city: '서귀포시', name: '안덕면', x: 244, y: 691 },
  { city: '서귀포시', name: '서귀포시 동지역', x: 590, y: 739 },
  { city: '서귀포시', name: '남원읍', x: 803, y: 632 },
  { city: '서귀포시', name: '표선면', x: 975, y: 549 },
  { city: '서귀포시', name: '성산읍', x: 1115, y: 419 },
  { city: '제주시', name: '한라산', x: 540, y: 480 },
]

export const nearestRegion = (x, y) =>
  REGIONS.reduce((best, r) => ((r.x - x) ** 2 + (r.y - y) ** 2 < (best.x - x) ** 2 + (best.y - y) ** 2 ? r : best))

// 지도 1px ≈ 0.055km (제주도 동서 약 73km 기준 추정)
export const KM_PER_PX = 0.055
