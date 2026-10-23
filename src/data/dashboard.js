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
    sensors: [[12, 11, 1, 0], [6, 6, 0, 0], [12, 11, 0, 1]], hazards: [[4, 1], [3, 2], [4, 2]],
  },
  제주시: {
    status: [1, 1, 1, 5], refreeze: 1, refreezeTop: 'B-4 번영로 · 11:10 재결빙 예상', missing: 2, missingTop: '비자림로 송당 · 위험 발생 후 6h 미조치',
    sensors: [[7, 6, 1, 0], [4, 3, 1, 0], [7, 7, 0, 0]], hazards: [[2, 1], [2, 1], [3, 1]],
  },
  서귀포시: {
    status: [0, 0, 1, 3], refreeze: 1, refreezeTop: 'N-3 남조로 · 11:30 재결빙 예상', missing: 1, missingTop: '남조로 수망 · 위험 발생 후 2h 미조치',
    sensors: [[5, 4, 0, 1], [2, 2, 0, 0], [5, 5, 0, 0]], hazards: [[2, 1], [2, 1], [2, 1]],
  },
}
JUR_DATA.전체 = {
  status: [2, 3, 5, 16], refreeze: 5, refreezeTop: 'K-12 1100도로 · 10:40 재결빙 예상', missing: 6, missingTop: '5·16도로 교래 · 위험 발생 후 4h 미조치',
  sensors: [0, 1, 2].map((i) => [0, 1, 2, 3].map((k) => ['도청', '제주시', '서귀포시'].reduce((s, j) => s + JUR_DATA[j].sensors[i][k], 0))),
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

export const SENSOR_TYPES = ['노면 센서', '제설제 농도', '제설차량 단말']
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
