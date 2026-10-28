import { HAZARD_ZONES, ROUTES, SEGMENTS_GEO, edgeMid, nearestRegionGeo } from './geo.js'

// 제설 구간 목업 데이터 (지도 좌표는 data/geo.js 의 SEGMENTS_GEO)

export const STATE_COLOR = { 미작업: '#f93c65', '제설 필요': '#ff8a3d', 진행중: '#fcbe2d', 완료: '#00b69b' }
export const RISK_COLOR = { 심각: '#e7000b', 경계: '#e0661a', 주의: '#e7000b', 관심: '#16a05d' }

// UC-GIS-009 제설 작업 상태 및 재결빙 위험 구간 / 구간 정보 레이어
export const SEGMENTS = [
  { code: 'K-12', road: '1100도로', place: '성판악', state: '진행중', risk: '심각', hazard: '블랙아이스', refreeze: true, roadTemp: -2.4, residue: 12, jur: '도청', region: '제주시' },
  { code: 'K-16-2', road: '5·16도로', place: '교래', state: '제설 필요', risk: '심각', hazard: '적설', refreeze: true, roadTemp: -1.8, residue: 18, jur: '도청', region: '조천읍' },
  { code: 'P-2', road: '평화로', place: '광령', state: '미작업', risk: '경계', hazard: '결빙', jur: '도청', region: '애월읍' },
  { code: 'B-4', road: '번영로', place: '대천', state: '미작업', risk: '경계', hazard: '결빙', refreeze: true, roadTemp: -0.9, residue: 24, jur: '도청', region: '조천읍' },
  { code: 'V-2', road: '비자림로', place: '송당', state: '미작업', risk: '주의', hazard: '적설', jur: '제주시', region: '구좌읍' },
  { code: 'S-1', road: '산록도로', place: '안덕', state: '완료', risk: '주의', hazard: '적설', habitual: true, jur: '서귀포시', region: '안덕면' },
  { code: 'N-3', road: '남조로', place: '수망', state: '진행중', risk: '주의', hazard: '결빙', habitual: true, jur: '서귀포시', region: '남원읍' },
  { code: 'H-1', road: '한창로', place: '한경', state: '완료', risk: '관심', hazard: '습기', habitual: true, jur: '제주시', region: '한경면' },
]
export const segName = (s) => `${s.road} · ${s.place} (${s.code})`

// ── 노선 구간(edge) 단위 정보 ─────────────────────────────
// 노선 구간 = 실제 노선 링크 하나. 지도에서 구간 하나를 고르면 그 구간의 정보를 보여준다.
// 위 SEGMENTS(대표 관측 구간)는 가장 가까운 구간에 겹쳐 같은 코드·정보를 쓰고, 나머지는 노선 데이터에서 만든다.

const ROUTE_PREFIX = { '1100도로': 'K', '5·16도로': 'M', 평화로: 'P', 번영로: 'B', 산록도로: 'S', 비자림로: 'V', 남조로: 'N' }
// 노면 상태 → 위험요소 · 재결빙 위험 등급 (위험구간 레이어에 속하지 않는 구간)
const SURFACE_RISK = { 아이스: ['결빙', '경계'], 적설: ['적설', '주의'], 슬러시: ['적설', '주의'], 젖음: ['없음', '주의'], 습기: ['없음', '관심'], 건조: ['없음', '관심'], 오류: ['확인 필요', '관심'] }
const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7)

export const ROUTE_SEGMENTS = ROUTES.flatMap((r) =>
  r.edges.map((e, idx) => {
    const at = edgeMid(e)
    const zone = HAZARD_ZONES.find((z) => z.route === r.name && idx >= z.from && idx <= z.to)
    const [hazard, risk] = zone ? [zone.type, zone.grade] : SURFACE_RISK[r.surface[idx]]
    const code = `${ROUTE_PREFIX[r.name]}-L${idx + 1}` // 링크(구간) 번호 — 대표 관측 구간 코드(K-12 등)와 구분
    const refreeze = r.states[idx] !== '완료' && (r.surface[idx] === '아이스' || zone?.type === '결빙' || zone?.type === '블랙아이스')
    const h = hash(code)
    return {
      code, road: r.name, place: nearestRegionGeo(at).name.replace(' 동지역', ''), route: r.name, idx, at, link: r.links[idx],
      state: r.states[idx], risk, hazard, refreeze,
      ...(refreeze && { roadTemp: -(0.5 + (h % 25) / 10).toFixed(1) * 1, residue: 8 + (h % 22) }),
    }
  }),
)

// 대표 관측 구간을 가장 가까운 노선 구간에 덮어쓰고, 표시 위치도 그 구간(실제 링크) 위로 옮긴다
SEGMENTS.forEach((s) => {
  const geo = SEGMENTS_GEO[s.code]
  const cands = ROUTE_SEGMENTS.filter((e) => e.road === s.road)
  if (!geo || !cands.length) return
  const near = cands.reduce((b, e) => (d2(e.at, geo) < d2(b.at, geo) ? e : b))
  SEGMENTS_GEO[s.code] = near.at
  Object.assign(near, { ...s, at: near.at, route: near.route, idx: near.idx, link: near.link })
})

const ALL = [...ROUTE_SEGMENTS, ...SEGMENTS.filter((s) => !ROUTE_SEGMENTS.some((e) => e.code === s.code))]
export const findSegment = (code) => ALL.find((s) => s.code === code) ?? null
export const segAt = (s) => s.at ?? SEGMENTS_GEO[s.code]
