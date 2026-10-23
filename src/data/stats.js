// UI-SIRS-002 통계 — 조회 조건으로 결정되는 목업 통계 생성기 (같은 조건이면 항상 같은 값)

export const SIDO = ['시/도 선택', '제주시', '서귀포시']
export const DONG = {
  '시/도 선택': ['읍면동 전체'],
  제주시: ['읍면동 전체', '노형동', '연동', '애월읍', '한림읍', '조천읍', '구좌읍', '한경면', '추자면'],
  서귀포시: ['읍면동 전체', '중문동', '서귀동', '대정읍', '안덕면', '남원읍', '표선면', '성산읍', '대륜동'],
}
const DEFAULT_REGIONS = ['제주시 노형', '애월읍', '한림읍', '조천읍', '구좌읍', '서귀포 중문', '성산읍', '대정읍']
export const ROUTES = ['1100도로', '평화로', '516도로', '비자림로', '한라산로', '남조로', '일주도로', '번영로']
export const HAZARD_TYPES = ['전체', '결빙', '블랙아이스', '적설', '슬러쉬', '습기']
export const GRADES = ['전체', '위험', '주의', '양호']
export const GRADE_COLORS = { 위험: '#f93c65', 주의: '#fcbe2d', 양호: '#00b69b' }

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

// ② 위험요소 조치 실적 · ③ 노선별 제설 조치 실적
export function actionStats({ from, to, unit, sido, dong }) {
  const r = rng(`act|${from}|${to}|${unit}|${sido}`)
  const scale = (days(from, to) / 30) * (unit === "월" ? 1.08 : unit === "주" ? 1.03 : 1) // 기간 길이에 비례
  const regions = sido === '시/도 선택' ? DEFAULT_REGIONS : DONG[sido].slice(1)
  const regionBars = regions.map((name, i) => ({ name, value: Math.round((60 - i * 4 + r() * 22) * scale) }))
  const routeBars = ROUTES.map((name, i) => ({ name, value: Math.round((56 - i * 3 + r() * 20) * scale) }))
  const mark = (bars, picked) => {
    const top = [...bars].sort((a, b) => b.value - a.value).slice(0, 2).map((b) => b.name)
    return bars.map((b) => ({ ...b, strong: picked && picked !== '읍면동 전체' ? b.name === picked : top.includes(b.name) }))
  }
  return { regionBars: mark(regionBars, dong), routeBars: mark(routeBars) }
}

// ⑤ 발생 추이 · ⑥ 시간대별 분포 · ⑦ 유형·등급별 분포
export function occurrenceStats({ from, to, unit, hazard, grade }) {
  const r = rng(`occ|${from}|${to}|${unit}|${hazard}`)
  const n = unit === '일' ? Math.min(days(from, to), 62) : unit === '주' ? Math.max(2, Math.ceil(days(from, to) / 7)) : Math.max(2, Math.ceil(days(from, to) / 30))
  const typeScale = hazard === '전체' ? 1 : 0.35 + r() * 0.2
  const start = new Date(from)
  const labels = Array.from({ length: n }, (_, i) => {
    if (unit === '일') { const d = new Date(start); d.setDate(d.getDate() + i); return `${d.getDate()}일` }
    if (unit === '주') return `${i + 1}주`
    const d = new Date(start); d.setMonth(d.getMonth() + i); return `${d.getMonth() + 1}월`
  })
  const unitScale = unit === '일' ? 1 : unit === '주' ? 2.4 : 6
  const wave = (i, base, amp) => Math.max(0, (base + amp * Math.sin(i / 2.2 + r() * 0.6) + r() * amp * 0.6) * typeScale * unitScale)
  const series = {
    위험: labels.map((_, i) => wave(i, 7, 4)),
    주의: labels.map((_, i) => wave(i, 15, 6)),
    양호: labels.map((_, i) => wave(i, 28, 9)),
  }
  const hourly = Array.from({ length: 24 }, (_, h) => {
    const peak = Math.exp(-((h - 7) ** 2) / 3) * 24 + Math.exp(-((h - 18) ** 2) / 6) * 8
    return Math.round((8 + peak + r() * 6) * typeScale * (days(from, to) / 30))
  })
  const types = ['결빙', '블랙아이스', '적설', '슬러쉬', '습기']
  const grades = types.map((t, i) => {
    const tot = (390 - i * 55 + r() * 60) * (days(from, to) / 30)
    const d = 0.08 + r() * 0.07
    const w = 0.3 + r() * 0.08
    return { type: t, 위험: Math.round(tot * d), 주의: Math.round(tot * w), 양호: Math.round(tot * (1 - d - w)) }
  })
  return { labels, series, hourly, grades, grade, hazard }
}

export const fmtRange = (from, to) => `${from.replaceAll('-', '.')} ~ ${to.slice(5).replace('-', '.')}`
