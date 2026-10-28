// UI-001 통합 관제 대시보드 목업 데이터
import { A } from '../assets.js'

export const SNOW_STATUS_KEYS = [
  { key: '미작업', color: '#d92338' },
  { key: '제설 필요', color: '#dc7200' },
  { key: '진행 중', color: '#f59e0b' },
  { key: '완료', color: '#168e79' },
]

// 행정시(관할)별 종합 현황 — 도청·제주시·서귀포시 합계 = 전체
export const JURISDICTIONS = ['전체', '도청', '제주시', '서귀포시']
export const JUR_DATA = {
  도청: {
    status: [1, 2, 3, 8], refreeze: 3, refreezeTop: 'K-12 1100도로 · 10:40 재결빙 예상', missing: 3, missingTop: '5·16도로 교래 · 위험 발생 후 4h 미조치',
    hazards: [[4, 1], [3, 2], [4, 2]],
  },
  제주시: {
    status: [1, 1, 1, 5], refreeze: 1, refreezeTop: 'B-4 번영로 · 11:10 재결빙 예상', missing: 2, missingTop: '비자림로 송당 · 위험 발생 후 6h 미조치',
    hazards: [[2, 1], [2, 1], [3, 1]],
  },
  서귀포시: {
    status: [0, 0, 1, 3], refreeze: 1, refreezeTop: 'N-3 남조로 · 11:30 재결빙 예상', missing: 1, missingTop: '남조로 수망 · 위험 발생 후 2h 미조치',
    hazards: [[2, 1], [2, 1], [2, 1]],
  },
}
JUR_DATA.전체 = {
  status: [2, 3, 5, 16], refreeze: 5, refreezeTop: 'K-12 1100도로 · 10:40 재결빙 예상', missing: 6, missingTop: '5·16도로 교래 · 위험 발생 후 4h 미조치',
  hazards: [0, 1, 2].map((i) => [0, 1].map((k) => ['도청', '제주시', '서귀포시'].reduce((s, j) => s + JUR_DATA[j].hazards[i][k], 0))),
}

// 지역(읍면동)별 기상 현황 — 행정구역 경로(지도 가운데)와 연동
const hash = (str) => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 9973, 7)
export function weatherAt(region) {
  const h = hash(region)
  const mountain = region === '한라산'
  return [
    { label: '적설량', value: (mountain ? 3.2 : (h % 9) / 10).toFixed(1), unit: 'cm' },
    { label: '강수량(1h)', value: ((h % 7) / 10).toFixed(1), unit: 'mm' },
    { label: '기온', value: (mountain ? -4.6 : ((h % 50) - 10) / 10).toFixed(1), unit: '°C' },
    { label: '습도', value: String(68 + (h % 25)), unit: '%' },
  ]
}

// 도로 위험 발생 가능성 · 권역별 (관할 선택과 연동)
export const RISK_GRADE = {
  심각: { bar: '#f93c65', text: '#f93c65', bg: 'rgba(249,60,101,0.16)' },
  경계: { bar: '#ff8a3d', text: '#e0661a', bg: 'rgba(255,138,61,0.16)' },
  주의: { bar: '#fcbe2d', text: '#b7791f', bg: 'rgba(252,190,45,0.2)' },
}
const RISK_ROWS = {
  hallasan: { name: '한라산·중산간', sub: '1100·5·16도로', temp: -4.6, prob: 86, grade: '심각' },
  jejuW: { name: '제주시 서부', sub: '애월·한림', temp: -0.5, prob: 68, grade: '경계' },
  jejuE: { name: '제주시 동부', sub: '조천·구좌', temp: 0.4, prob: 52, grade: '주의' },
  segwiW: { name: '서귀포시 서부', sub: '안덕·대정', temp: 0.3, prob: 48, grade: '주의' },
  segwiE: { name: '서귀포시 동부', sub: '남원·표선', temp: 0.9, prob: 41, grade: '주의' },
}
export const REGION_RISK = {
  전체: { total: { grade: '경계', prob: 64 }, rows: [RISK_ROWS.hallasan, RISK_ROWS.jejuW] },
  도청: { total: { grade: '심각', prob: 77 }, rows: [RISK_ROWS.hallasan, RISK_ROWS.jejuW] },
  제주시: { total: { grade: '경계', prob: 60 }, rows: [RISK_ROWS.jejuW, RISK_ROWS.jejuE] },
  서귀포시: { total: { grade: '주의', prob: 45 }, rows: [RISK_ROWS.segwiW, RISK_ROWS.segwiE] },
}
export const HAZARD_LABELS = ['블랙아이스', '적설', '결빙']

// 최근 7일 조치 (완료/미완료)
export const HAZARD_DAILY = [
  { d: '목', done: 12, todo: 0 },
  { d: '금', done: 9, todo: 0 },
  { d: '토', done: 14, todo: 1 },
  { d: '일', done: 20, todo: 1 },
  { d: '월', done: 17, todo: 1 },
  { d: '화', done: 20, todo: 2 },
  { d: '오늘', done: 11, todo: 13 },
]

export const HAZARD_RECENT = [
  { time: '09:28', type: '블랙아이스', place: '평화로 · 광령', state: '조치중', jur: '도청', seg: 'P-2' },
  { time: '09:15', type: '결빙', place: '1100도로 · 성판악', state: '완료', jur: '도청', seg: 'K-12' },
  { time: '08:40', type: '적설', place: '5·16도로 · 교래', state: '미조치', jur: '도청', seg: 'K-16-2' },
  { time: '08:05', type: '결빙', place: '비자림로 · 송당', state: '미조치', jur: '제주시', seg: 'V-2' },
  { time: '07:40', type: '적설', place: '남조로 · 수망', state: '조치중', jur: '서귀포시', seg: 'N-3' },
  { time: '07:12', type: '블랙아이스', place: '산록도로 · 안덕', state: '완료', jur: '서귀포시', seg: 'S-1' },
]

export const ACTION_BADGE = { 조치중: '#bfdbfe', 완료: '#c7f5ce', 미조치: '#ffd2d5' }

// 제설 차량 목록 (UI-001-04) — mapId 는 지도 위 차량 아이콘과 연결
export const VEHICLE_STATUS = {
  working: { label: '제설 중', bg: '#fff8d9', fg: '#b98900', dot: A.dotWorking },
  standby: { label: '대기', bg: '#edf4ff', fg: '#3979ee', dot: A.dotStandby },
  done: { label: '종료', bg: '#ededf0', fg: '#6b6b73', dot: A.dotDone },
}

// 관할: 지방도(1100도로·5·16도로·평화로·번영로)는 도청, 차고지·노선 위치에 따라 제주시/서귀포시
const JEJU_CITY = ['노형', '애월', '한림', '조천']
const jurOf = (info) =>
  /1100도로|5·16도로|평화로|번영로/.test(info) ? '도청' : JEJU_CITY.some((k) => info.includes(k)) ? '제주시' : '서귀포시'
const v = (type, name, info, status, battery, extra = {}) => ({ type, name, info, status, battery, jur: extra.jur ?? jurOf(info), ...extra })
export const VEHICLES = [
  v('임차', '11호차', '평화로 · 32km/h', 'working', 100, { mapId: 3, plate: '제주 98사 1011' }),
  v('유니목', '9965', '1100도로 · 28km/h', 'working', 100, { mapId: 1 }),
  v('유니목', '0693', '5·16도로 · 24km/h', 'working', 92, { mapId: 2 }),
  v('덤프', '9108', '번영로 · 35km/h', 'working', 88, { mapId: 4 }),
  v('임차', '3호차', '평화로 · 30km/h', 'working', 76, { mapId: 10 }),
  v('다목적', '4337', '산록도로 · 22km/h', 'working', 64, { mapId: 6 }),
  v('임차', '7호차', '5·16도로 · 26km/h', 'working', 81, { mapId: 7 }),
  v('덤프', '9109', '산록도로 · 18km/h', 'working', 57, { mapId: 8 }),
  v('임차', '4호차', '번영로 · 3분 전 수신', 'working', 18, { mapId: 5, delayed: true }),
  v('유니목', '3666', '1100도로 · 20km/h', 'working', 66, { mapId: 9 }),
  v('임차', '10호차', '노형 차고지 · 42분', 'standby', 100),
  v('임차', '12호차', '노형 차고지 · 42분', 'standby', 81),
  v('임차', '13호차', '서귀포 차고지 · 1h', 'standby', 100),
  v('임차', '14호차', '서귀포 차고지 · 1h', 'standby', 100),
  v('임차', '2호차', '조천 차고지 · 25분', 'standby', 89),
  v('임차', '5호차', '조천 차고지 · 25분', 'standby', 100),
  v('임차', '6호차', '애월 차고지 · 18분', 'standby', 95),
  v('임차', '8호차', '애월 차고지 · 18분', 'standby', 100),
  v('임차', '9호차', '한림 차고지 · 10분', 'standby', 72),
  v('다목적', '4338', '노형 차고지 · 42분', 'standby', 100),
  v('덤프', '9110', '서귀포 차고지 · 1h', 'standby', 90),
  v('유니목', '2959', '07:10 종료 · 3h 20m', 'done', 100, { jur: '도청' }),
  v('유니목', '4600', '06:55 종료 · 2h 05m', 'done', 1),
  v('임차', '1호차', '06:40 종료 · 2h 50m', 'done', 1, { jur: '제주시' }),
  v('덤프', '9111', '07:30 종료 · 3h 10m', 'done', 45),
  v('다목적', '4339', '07:05 종료 · 1h 40m', 'done', 60, { jur: '제주시' }),
  v('유니목', '5120', '06:20 종료 · 2h 30m', 'done', 33),
  v('임차', '15호차', '07:45 종료 · 3h 05m', 'done', 70),
]

// 위험구간 목록 (GIS-003) — 읍면동 묶음 · 노면온도 순. 색 = 위험 유형(HAZARD_COLORS), 굵기 = 등급
export const HAZARD_GRADES = ['심각', '경계', '주의']
export const HAZARD_GRADE_STYLE = {
  심각: { text: '#f93c65', bg: 'rgba(249,60,101,0.16)', dot: A.dotGradeSevere, bar: 7 },
  경계: { text: '#e8701a', bg: 'rgba(255,138,61,0.16)', dot: A.dotGradeAlert, bar: 5 },
  주의: { text: '#b98100', bg: 'rgba(252,190,45,0.16)', dot: A.dotGradeCaution, bar: 3 },
}
const ROW_KEYS = ['road', 'dong', 'type', 'grade', 'surface', 'salt', 'air', 'sky']
const row = (...vals) => Object.fromEntries(ROW_KEYS.map((k, i) => [k, vals[i]]))
// 읍면동 묶음: [이름, 관할, 행정동, 도로, 등급별 건수(심각·경계·주의)] — 연동·노형은 시안 값 그대로
const GROUPS = [
  ['연동·노형', '제주시', ['노형동', '연동'], [], [4, 4, 4]],
  ['아라·오라', '제주시', ['아라동', '오라동'], ['5·16도로', '아연로', '오라로', '아봉로', '첨단로', '오남로', '산천단남길', '고다시길', '연북로', '오도로', '월평로', '영평길', '아란13길', '오라남로'], [3, 5, 6]],
  ['중문·예래', '서귀포시', ['중문동', '예래동'], ['1100도로', '일주서로', '중문관광로', '천제연로', '예래로', '대포로', '중문상로', '색달로', '하예로', '상예로'], [3, 4, 3]],
  ['서귀포 동지역', '서귀포시', ['동홍동', '서홍동', '영천동', '효돈동', '대륜동'], ['516로', '중산간동로', '중앙로', '일주동로', '동홍로', '신서로', '효돈로', '서홍로', '토평로', '솜반천로', '하신상로', '태평로'], [2, 4, 6]],
  ['봉개', '제주시', ['봉개동'], ['번영로', '명림로', '봉개로', '용강로', '회천길', '봉개서길', '용강7길', '명도암길', '절물로', '번영로2길', '회천동길'], [2, 5, 4]],
  ['남원읍', '서귀포시', ['남원읍'], ['남조로', '일주동로', '태위로', '한남로', '신례로', '의귀로', '수망로', '위미중앙로'], [2, 3, 3]],
  ['일도·이도·삼도', '제주시', ['일도2동', '이도2동', '이도1동', '삼도1동'], ['연삼로', '동광로', '중앙로', '고마로', '서광로', '신산로', '남성로', '동문로', '광양9길', '삼성로', '일주동로', '관덕로', '서사로'], [1, 5, 7]],
  ['외도·이호·도두', '제주시', ['외도동', '이호동', '도두동'], ['일주서로', '우정로', '도령로', '이호서로', '도두봉길', '외도천로', '도공로', '이호일동길', '사수동길'], [1, 4, 4]],
  ['화북·삼양', '제주시', ['화북동', '삼양동'], ['일주동로', '화삼로', '삼봉로', '선사로', '도련로', '화북로', '삼화로', '원당로'], [1, 3, 4]],
  ['애월읍', '제주시', ['애월읍'], ['평화로', '애원로', '납읍로', '일주서로', '광령평화길', '하소로', '애조로'], [1, 3, 3]],
  ['조천읍', '제주시', ['조천읍'], ['번영로', '비자림로', '남조로', '교래로', '신북로', '함와로'], [1, 2, 3]],
  ['안덕면', '서귀포시', ['안덕면'], ['평화로', '산록남로', '일주서로', '화순로', '안덕로'], [1, 2, 2]],
]
const DESIGN_ROWS = [
  row('1100로', '노형동', '결빙', '심각', -3.9, 8, -4.9, '눈'),
  row('도령로', '노형동', '결빙', '심각', -2.8, 11, -5.3, '눈'),
  row('신대로', '연동', '적설', '심각', -2.8, 6, -3.7, '눈'),
  row('연북로', '연동', '블랙아이스', '심각', -2.3, 13, -3.8, '눈'),
  row('평화로', '노형동', '적설', '경계', -1.8, 17, -3.5, '눈'),
  row('연삼로', '연동', '블랙아이스', '경계', -1.6, 16, -3.1, '흐림'),
  row('노형로', '노형동', '결빙', '경계', -1.4, 18, -2.9, '흐림'),
  row('원노형로', '노형동', '블랙아이스', '경계', -1.2, 19, -2.2, '흐림'),
  row('신광로', '연동', '블랙아이스', '주의', -0.9, 24, -1.5, '흐림'),
  row('월랑로', '노형동', '적설', '주의', -0.7, 22, -1.8, '눈'),
  row('1100로', '연동', '결빙', '주의', -0.5, 27, -1.2, '흐림'),
  row('산록북로', '노형동', '적설', '주의', -0.3, 29, -0.8, '흐림'),
]
// 등급별 노면온도·제설제 잔량 범위 — 나머지 묶음은 이 범위 안에서 고정 값으로 만든다
const GRADE_RANGE = { 심각: [-3.9, -2.2, 6, 14], 경계: [-1.9, -1.1, 15, 20], 주의: [-0.9, -0.2, 21, 30] }
const TYPES = ['결빙', '적설', '블랙아이스']
export const HAZARD_LIST = GROUPS.map(([name, jur, dongs, roads, counts], gi) => {
  let n = 0
  const rows = gi === 0
    ? DESIGN_ROWS
    : HAZARD_GRADES.flatMap((grade, k) =>
        Array.from({ length: counts[k] }, (_, i) => {
          const h = hash(`${name}${grade}${i}`)
          const [t0, t1, s0, s1] = GRADE_RANGE[grade]
          const surface = +(t0 + ((t1 - t0) * (i + 0.5)) / counts[k]).toFixed(1)
          const air = +(surface - 0.4 - (h % 12) / 10).toFixed(1)
          n += 1
          return row(roads[(n - 1) % roads.length], dongs[(n - 1) % dongs.length], TYPES[h % 3], grade, surface, s0 + (h % (s1 - s0)), air, h % 2 ? '눈' : '흐림')
        }),
      )
  return { name, jur, rows: rows.map((r, i) => ({ ...r, id: `${gi}-${i}` })) }
})
