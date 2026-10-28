// 지도에 올릴 목업 공간 데이터 (경위도 EPSG:4326, [경도, 위도])
// 노선 모양은 실제 노선 링크(links.js)를 쓰고, via 는 노선을 고를 때 쓴 근사 경유지다.
import { A } from '../assets.js'
import { ADM_DONG } from './admdong.js'
import { LINKS, ROUTE_LINKS } from './links.js'

export const JEJU_CENTER = [126.55, 33.37]

// 제설 우선노선(priority: 순위) · 주요 교통량 축(traffic: 등급, 일평균 만 대) + via 구간별 제설 작업 상태(states) · 제설 작업 횟수(counts) · 노면 상태(surface)
export const ROUTES = [
  {
    name: '1100도로', priority: 1, traffic: { grade: 3, daily: 1.2 },
    via: [[126.4895, 33.4787], [126.488, 33.45], [126.49, 33.421], [126.492, 33.392], [126.47, 33.36], [126.462, 33.345], [126.453, 33.32], [126.44, 33.29], [126.425, 33.258]],
    states: ['완료', '진행중', '진행중', '진행중', '제설 필요', '진행중', '완료', '완료'],
    counts: [2, 3, 5, 3, 2, 1, 1, 0],
    surface: ['아이스', '슬러시', '아이스', '적설', '젖음', '아이스', '젖음', '건조'],
  },
  {
    name: '5·16도로', priority: 1, traffic: { grade: 2, daily: 2.6 },
    via: [[126.537, 33.49], [126.558, 33.45], [126.59, 33.415], [126.62, 33.386], [126.615, 33.35], [126.595, 33.31], [126.57, 33.27]],
    states: ['완료', '제설 필요', '제설 필요', '진행중', '완료', '완료'],
    counts: [3, 1, 0, 2, 3, 2],
    surface: ['젖음', '적설', '아이스', '슬러시', '젖음', '건조'],
  },
  {
    name: '평화로', priority: 1, traffic: { grade: 1, daily: 4.2 },
    via: [[126.46, 33.48], [126.42, 33.45], [126.38, 33.41], [126.34, 33.36], [126.31, 33.31], [126.28, 33.26], [126.26, 33.23]],
    states: ['미작업', '미작업', '제설 필요', '진행중', '완료', '완료'],
    counts: [0, 0, 1, 2, 3, 3],
    surface: ['아이스', '아이스', '슬러시', '젖음', '습기', '건조'],
  },
  {
    name: '번영로', priority: 2, traffic: { grade: 1, daily: 3.8 },
    via: [[126.59, 33.495], [126.64, 33.47], [126.7, 33.44], [126.75, 33.415], [126.8, 33.39], [126.83, 33.35], [126.84, 33.33]],
    states: ['완료', '미작업', '미작업', '진행중', '완료', '완료'],
    counts: [2, 0, 0, 1, 3, 2],
    surface: ['습기', '적설', '아이스', '슬러시', '젖음', '건조'],
  },
  {
    name: '산록도로', priority: 2, traffic: { grade: 3, daily: 0.9 },
    via: [[126.36, 33.33], [126.42, 33.3], [126.5, 33.29], [126.58, 33.295], [126.62, 33.3]],
    states: ['완료', '완료', '제설 필요', '진행중', '완료'],
    counts: [3, 2, 1, 2, 6],
    surface: ['젖음', '슬러시', '적설', '아이스', '젖음'],
  },
  {
    name: '비자림로',
    via: [[126.67, 33.45], [126.7, 33.44], [126.74, 33.45], [126.78, 33.46], [126.81, 33.48]],
    states: ['미작업', '미작업', '제설 필요', '완료'],
    counts: [0, 0, 1, 2],
    surface: ['적설', '아이스', '슬러시', '젖음'],
  },
  {
    name: '남조로', priority: 3,
    via: [[126.66, 33.44], [126.67, 33.4], [126.69, 33.36], [126.7, 33.33], [126.71, 33.285]],
    states: ['제설 필요', '진행중', '진행중', '완료'],
    counts: [1, 2, 2, 3],
    surface: ['슬러시', '젖음', '오류', '습기'],
  },
]

// ── 실제 노선 링크 적용 ─────────────────────────────
// 노선 모양은 실제 링크(links.js)를 이은 것이고, 구간(edge) = 링크 하나다.
// 구간별 상태·횟수·노면은 링크 중간점에서 가장 가까운 via 구간의 값을 이어받는다.
const KM = [92.9, 111.0] // 1도 ≈ km (위도 33.4°)
const segDistKm = (p, a, b) => {
  const [ax, ay, bx, by, px, py] = [a[0] * KM[0], a[1] * KM[1], b[0] * KM[0], b[1] * KM[1], p[0] * KM[0], p[1] * KM[1]]
  const dx = bx - ax
  const dy = by - ay
  const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0
  return Math.hypot(px - ax - t * dx, py - ay - t * dy)
}
const distKm = (a, b) => Math.hypot((a[0] - b[0]) * KM[0], (a[1] - b[1]) * KM[1])
export const edgeMid = (e) => e[Math.floor(e.length / 2)]

export const ALL_LINKS = LINKS.map(([id, jur, dong, len, coords]) => ({ id, jur, dong, len, coords }))
const LINK_BY_ID = new Map(ALL_LINKS.map((l) => [l.id, l]))

ROUTES.forEach((r) => {
  const chain = ROUTE_LINKS[r.name]
  const edges = chain.map(([id, rev]) => (rev ? [...LINK_BY_ID.get(id).coords].reverse() : LINK_BY_ID.get(id).coords))
  const viaEdge = edges.map((e) => {
    const p = edgeMid(e)
    let best = 0
    r.via.slice(0, -1).forEach((a, i) => { if (segDistKm(p, a, r.via[i + 1]) < segDistKm(p, r.via[best], r.via[best + 1])) best = i })
    return best
  })
  Object.assign(r, {
    links: chain.map(([id]) => id),
    edges,
    viaEdge,
    coords: edges.flatMap((e, i) => (i ? e.slice(1) : e)),
    states: viaEdge.map((i) => r.states[i]),
    counts: viaEdge.map((i) => r.counts[i]),
    surface: viaEdge.map((i) => r.surface[i]),
  })
})

// 경로 위에서 가장 가까운 꼭짓점 번호
const nearestVertex = (path, p) => path.reduce((best, q, i) => (distKm(q, p) < distKm(path[best], p) ? i : best), 0)

// 제설 작업 횟수 · 노면 상태 색상 (UI-SIRS-001-02·03 범례)
export const COUNT_COLORS = { 0: '#334155', 1: '#2563eb', 2: '#f97316', 3: '#0d9488', 4: '#7e22ce', 5: '#ef233c' }
export const SURFACE_COLORS = { 오류: '#334155', 건조: '#22c55e', 습기: '#60a5fa', 젖음: '#1d4ed8', 적설: '#ec4899', 아이스: '#ef4444', 슬러시: '#f97316' }

// 주요 교통량 축 밴드 폭(px) — 1·2·3등급
export const TRAFFIC_WIDTH = { 1: 20, 2: 14, 3: 10 }

// 블랙아이스·적설·결빙 위험구간 (UI-SIRS-001-006) — 도로 라인 위 반투명 띠: 색 = 위험 유형, 굵기 = 위험 등급
// from·to 는 via 구간 번호로 적고, 아래에서 실제 링크 구간(edges) 번호 범위로 바꾼다
export const HAZARD_COLORS = { 블랙아이스: '#6d28d9', 적설: '#0ea5e9', 결빙: '#1447e6' }
export const HAZARD_WIDTH = { 심각: 16, 경계: 12, 주의: 8 }
export const HAZARD_ZONES = [
  { route: '1100도로', from: 1, to: 3, type: '블랙아이스', grade: '심각', action: '미조치', seg: 'K-12', place: 'K-12 성판악' },
  { route: '5·16도로', from: 1, to: 3, type: '적설', grade: '경계', action: '조치중', seg: 'K-16-2', place: '교래' },
  { route: '평화로', from: 1, to: 3, type: '결빙', grade: '경계', action: '미조치', seg: 'P-2', place: '광령' },
  { route: '번영로', from: 0, to: 1, type: '결빙', grade: '주의', action: '조치중', seg: 'B-4', place: '대천' },
  { route: '산록도로', from: 1, to: 2, type: '적설', grade: '주의', action: '미조치', seg: 'S-1', place: '안덕' },
]
HAZARD_ZONES.forEach((z) => {
  const r = ROUTES.find((x) => x.name === z.route)
  const idx = r.viaEdge.flatMap((v, i) => (v >= z.from && v <= z.to ? [i] : []))
  Object.assign(z, idx.length ? { from: Math.min(...idx), to: Math.max(...idx) } : { from: 0, to: 0 })
})

// 구간 정보 (UC-GIS-009) — 코드·명칭은 시안 기준
export const SEGMENTS_GEO = {
  'K-12': [126.491, 33.406],
  'K-16-2': [126.605, 33.4],
  'P-2': [126.44, 33.465],
  'B-4': [126.67, 33.455],
  'V-2': [126.77, 33.457],
  'S-1': [126.35, 33.345],
  'N-3': [126.69, 33.36],
  'H-1': [126.21, 33.33],
}
// 실제 링크 위로 붙인다 (노선 구간은 segments.js 에서 해당 노선 위로 다시 맞춘다)
const ALL_VERTICES = ALL_LINKS.flatMap((l) => l.coords)
Object.keys(SEGMENTS_GEO).forEach((k) => { SEGMENTS_GEO[k] = ALL_VERTICES[nearestVertex(ALL_VERTICES, SEGMENTS_GEO[k])] })

// 지도 위 제설 차량 (mapId 는 차량 목록과 연결)
export const VEHICLES_GEO = [
  { id: 1, type: '유니목', road: '1100도로', at: [126.489, 33.435] },
  { id: 2, type: '유니목', road: '5·16도로', at: [126.575, 33.432] },
  { id: 3, type: '임차', road: '평화로', at: [126.4, 33.43] },
  { id: 4, type: '덤프', road: '번영로', at: [126.62, 33.48] },
  { id: 5, type: '임차', road: '번영로', at: [126.79, 33.395] },
  { id: 6, type: '다목적', road: '산록도로', at: [126.44, 33.3] },
  { id: 7, type: '임차', road: '5·16도로', at: [126.618, 33.37] },
  { id: 8, type: '덤프', road: '산록도로', at: [126.56, 33.295] },
  { id: 9, type: '다목적', road: '1100도로', at: [126.458, 33.333] },
  { id: 10, type: '임차', road: '평화로', at: [126.325, 33.335] },
  { id: 11, type: '유니목', road: '5·16도로', at: [126.605, 33.33] },
  { id: 12, type: '덤프', road: '번영로', at: [126.82, 33.37] },
]
// 차량은 운행 중인 노선의 실제 도로 위에 놓는다
VEHICLES_GEO.forEach((v) => {
  const path = ROUTES.find((r) => r.name === v.road).coords
  v.at = path[nearestVertex(path, v.at)]
})

export const CCTV_GEO = [
  [126.45, 33.47], [126.56, 33.46], [126.39, 33.4], [126.625, 33.39], [126.47, 33.34], [126.73, 33.43], [126.31, 33.3],
].map((at, i) => ({ id: i + 1, at }))

export const WEATHER_GEO = [
  { name: '제주시', temp: 1.8, icon: A.wxCloud, at: [126.53, 33.5] },
  { name: '애월', temp: -0.5, icon: A.wxSnow, at: [126.33, 33.46] },
  { name: '조천', temp: 1.2, icon: A.wxSunCloud, at: [126.64, 33.54] },
  { name: '한라산', temp: -4.6, icon: A.wxSnow, at: [126.53, 33.36] },
  { name: '안덕', temp: 0.3, icon: A.wxRainSnow, at: [126.36, 33.25] },
  { name: '대정', temp: 2.1, icon: A.wxSunCloud, at: [126.25, 33.22] },
  { name: '서귀포', temp: 2.6, icon: A.wxCloud, at: [126.56, 33.25] },
  { name: '남원', temp: 0.9, icon: A.wxRainSnow, at: [126.72, 33.28] },
]

// 읍면 대표 좌표 — 노선 구간의 대략적인 위치 이름(구간 팝업 등)에 사용
export const REGIONS_GEO = [
  { city: '제주시', name: '제주시 동지역', at: [126.53, 33.5] },
  { city: '제주시', name: '애월읍', at: [126.36, 33.44] },
  { city: '제주시', name: '한림읍', at: [126.27, 33.39] },
  { city: '제주시', name: '한경면', at: [126.19, 33.33] },
  { city: '제주시', name: '조천읍', at: [126.66, 33.5] },
  { city: '제주시', name: '구좌읍', at: [126.83, 33.5] },
  { city: '서귀포시', name: '대정읍', at: [126.25, 33.23] },
  { city: '서귀포시', name: '안덕면', at: [126.36, 33.27] },
  { city: '서귀포시', name: '서귀포시 동지역', at: [126.56, 33.26] },
  { city: '서귀포시', name: '남원읍', at: [126.72, 33.29] },
  { city: '서귀포시', name: '표선면', at: [126.83, 33.33] },
  { city: '서귀포시', name: '성산읍', at: [126.9, 33.43] },
  { city: '제주시', name: '한라산', at: [126.53, 33.36] },
]
export const nearestRegionGeo = ([lon, lat]) =>
  REGIONS_GEO.reduce((best, r) => ((r.at[0] - lon) ** 2 + (r.at[1] - lat) ** 2 < (best.at[0] - lon) ** 2 + (best.at[1] - lat) ** 2 ? r : best))

// 좌표가 속한 행정동(읍·면·동) — 경계 다각형 안쪽 판정, 바다 위면 가장 가까운 경계의 행정동
const inRings = (rings, [x, y]) => {
  let inside = false
  for (const ring of rings)
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]
      const [xj, yj] = ring[j]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
    }
  return inside
}
export function regionAtGeo(lonlat) {
  let hit = ADM_DONG.find((d) => d.rings.some((poly) => inRings(poly, lonlat)))
  if (!hit) {
    let bestD = Infinity
    for (const d of ADM_DONG)
      for (const poly of d.rings)
        for (const [x, y] of poly[0]) {
          const dd = (x - lonlat[0]) ** 2 + (y - lonlat[1]) ** 2
          if (dd < bestD) [bestD, hit] = [dd, d]
        }
  }
  return { city: hit.city, name: hit.name }
}

// 행정동 경계(가장 큰 외곽선)의 범위 중심 — 위험구간 목록에서 지도 이동 위치로 쓴다
export function admDongCenter(name) {
  const d = ADM_DONG.find((x) => x.name === name)
  if (!d) return null
  const outer = d.rings.map((poly) => poly[0]).reduce((a, b) => (b.length > a.length ? b : a))
  const xs = outer.map((p) => p[0])
  const ys = outer.map((p) => p[1])
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]
}

// 차량이 놓인 노선 구간(edge)과 진행 방향
export function vehicleTrack(v) {
  const path = ROUTES.find((r) => r.name === v.road).coords
  const at = nearestVertex(path, v.at)
  // 진행 방향은 노선 좌표 순서, 지나온 길은 약 3km
  let start = at
  for (let km = 0; start > 0 && km < 3; start -= 1) km += distKm(path[start], path[start - 1])
  const from = path[Math.max(0, at - 1)]
  const to = path[Math.min(path.length - 1, at + 1)]
  return { from, to, trail: path.slice(start, at + 1) }
}
