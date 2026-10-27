// UI-002 통계 — 조회 조건으로 결정되는 목업 통계 생성기 (같은 조건이면 항상 같은 값)

export const SIDO = ['전체', '제주시', '서귀포시']
export const DONG = {
  제주시: ['노형동', '아라동', '애월읍', '한림읍', '조천읍', '구좌읍', '봉개동', '오라동', '한경면'],
  서귀포시: ['중문동', '서귀동', '대정읍', '안덕면', '남원읍', '표선면', '성산읍', '대륜동'],
}
export const dongOptions = (sido) => ['읍면동 전체', ...(sido === '전체' ? [] : DONG[sido])]
export const HAZARD_TYPES = ['전체', '결빙', '블랙아이스', '적설']
export const GRADE_OPTIONS = ['전체 (주의 이상)', '심각', '경계', '주의']
export const GRADES = ['심각', '경계', '주의']
export const GRADE_COLORS = { 심각: '#f93c65', 경계: '#ff8a3d', 주의: '#fcbe2d' }
const ROUTES = ['516도로', '1100도로', '평화로', '산록북로', '애조로', '번영로', '남조로', '비자림로', '일주도로', '한라산로']

export const DEFAULT_FILTER = { from: '2026-11-01', to: '2026-11-30', unit: '일', sido: '전체', dong: '읍면동 전체', hazard: '전체', grade: '전체 (주의 이상)' }

const seed = (str) => [...str].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0), 2166136261)
export function rng(str) {
  let a = seed(str)
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const days = (from, to) => Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000) + 1)

// 집계 단위별 x축 라벨 (일: 11/1 · 주: 1주 · 월: 11월)
function buckets(from, to, unit) {
  const n = unit === '일' ? Math.min(days(from, to), 62) : unit === '주' ? Math.max(2, Math.ceil(days(from, to) / 7)) : Math.max(2, Math.ceil(days(from, to) / 30))
  const start = new Date(from)
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(start)
    if (unit === '일') { d.setDate(d.getDate() + i); return `${d.getMonth() + 1}/${d.getDate()}` }
    if (unit === '주') return `${i + 1}주`
    d.setMonth(d.getMonth() + i)
    return `${d.getMonth() + 1}월`
  })
}

export function statsData(f) {
  const { from, to, unit, sido, dong, hazard, grade } = f
  const r = rng(`stats|${from}|${to}|${unit}|${sido}|${dong}|${hazard}`)
  const period = days(from, to) / 30
  const area = dong !== '읍면동 전체' ? 0.12 : sido === '전체' ? 1 : sido === '제주시' ? 0.56 : 0.44
  const typeScale = hazard === '전체' ? 1 : 0.3 + r() * 0.15
  const scale = period * area * typeScale
  const shown = grade.startsWith('전체') ? GRADES : [grade]

  // 위험요소 발생 추이 — 심각·경계·주의 라인
  const labels = buckets(from, to, unit)
  const unitScale = unit === '일' ? 1 : unit === '주' ? 7 : 30
  const wave = (i, base, amp) => Math.max(0, (base + amp * Math.sin(i / 2.4 + r() * 0.8) + (r() - 0.3) * amp) * area * typeScale * unitScale)
  const series = { 심각: labels.map((_, i) => wave(i, 5, 2.5)), 경계: labels.map((_, i) => wave(i, 10, 5)), 주의: labels.map((_, i) => wave(i, 16, 8)) }

  // 유형·등급별 발생 (기간 누적)
  const types = HAZARD_TYPES.slice(1).map((type, i) => {
    const tot = (408 - i * 120 + r() * 40) * period * area
    return { type, 심각: Math.round(tot * (0.1 + r() * 0.03)), 경계: Math.round(tot * (0.3 + r() * 0.04)), 주의: Math.round(tot * 0.56) }
  })

  // 일별 조치 실적 — 완료 / 미완료(최근 구간에 몰림)
  const action = labels.map((_, i) => {
    const done = Math.round((10 + 22 * Math.abs(Math.sin(i / 4.5 + 0.6)) + r() * 14) * area * typeScale * unitScale)
    const tail = i >= labels.length - 2 ? 0.5 + r() * 0.6 : r() < 0.12 ? 0.03 : 0
    return { done, undone: Math.round(done * tail) }
  })

  const occurred = Math.round(types.filter((t) => hazard === '전체' || t.type === hazard).reduce((s, t) => s + shown.reduce((a, g) => a + t[g], 0), 0))
  const done = Math.round(occurred * (0.94 + r() * 0.04))
  const unresolved = occurred - done
  const mins = 70 + Math.round(r() * 50)
  const works = Math.round(550 * scale)
  const kpi = {
    occurred, done, prevDelta: (r() * 30 - 6).toFixed(1),
    rate: occurred ? ((done / occurred) * 100).toFixed(1) : '0.0',
    avg: { h: Math.floor(mins / 60), m: mins % 60 },
    unresolved, longUnresolved: Math.round(unresolved * 0.36), inProgress: Math.round(unresolved * 1.07),
    works, length: Math.round(works * 7.4), segRate: (93 + r() * 5).toFixed(1),
    sensor: { ok: 21, warn: 2, miss: 1 },
    vehicle: { ok: 23, warn: 0, miss: 1 },
  }

  return { labels, series, shown, types, action, kpi, dongTable: dongTable(f, r, period), hazard, grade }
}

// 읍면동별 제설 현황 — 행정시 소계 + 읍면동 행
function dongTable({ sido, dong }, r, period) {
  const cities = sido === '전체' ? ['제주시', '서귀포시'] : [sido]
  return cities.map((city) => {
    const names = dong !== '읍면동 전체' && DONG[city].includes(dong) ? [dong] : DONG[city]
    const rows = names.map((name) => {
      const occ = Math.round((30 + r() * 60) * period)
      const work = Math.round(occ * (0.55 + r() * 0.1))
      return { name, occ, work, rate: Math.round(50 + r() * 40) }
    })
    const occ = rows.reduce((s, x) => s + x.occ, 0)
    const work = rows.reduce((s, x) => s + x.work, 0)
    return { city, occ, work, rate: Math.round(rows.reduce((s, x) => s + x.rate, 0) / rows.length), rows }
  })
}

// 노선별 제설 현황 — 선택한 읍면동(또는 행정시)을 지나는 노선
export function routeTable(area, { from, to }) {
  const r = rng(`route|${area}|${from}|${to}`)
  const period = days(from, to) / 30
  const start = Math.floor(r() * ROUTES.length)
  const rows = Array.from({ length: 3 }, (_, i) => {
    const work = Math.round((10 + r() * 12) * period)
    return { name: ROUTES[(start + i * 3) % ROUTES.length], work, km: Math.round(work * (1.2 + r() * 0.3)), rate: [100, 50, 75, 100, 88][Math.floor(r() * 5)] }
  })
  const work = rows.reduce((s, x) => s + x.work, 0)
  const km = rows.reduce((s, x) => s + x.km, 0)
  return { rows, total: { work, km, rate: Math.round(rows.reduce((s, x) => s + x.rate * x.work, 0) / work) } }
}

export const fmtRange = (from, to) => `${from.replaceAll('-', '.')} ~ ${to.replaceAll('-', '.')}`
