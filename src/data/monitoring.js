// UI-SIRS-004 데이터 연계 모니터링 — 배치·송수신 이력 목업 데이터와 저장소
import { createStore } from '../store.js'
import { rng } from './stats.js'

export const MOCK_TODAY = '2026-10-19' // 목업 기준일(시안 데이터 기준) — 조회 기간 기본값 '오늘'
export const TARGETS = ['전체', '기상청', '스마트빌리지 인프라', '제주데이터허브']
export const RESULTS = ['전체', '성공', '실패', '부분 성공', '재처리 성공']
export const EVERY = ['1분', '5분', '10분', '15분', '30분', '1시간', '1일']
export const EVERY_MIN = { '1분': 1, '5분': 5, '10분': 10, '15분': 15, '30분': 30, '1시간': 60, '1일': 1440 }

const INITIAL_BATCHES = [
  { id: 'KMA-NCST-01', name: '초단기실황(AWS) 수신', item: '초단기실황', target: '기상청', dir: '수신', every: '10분', last: '10:30:00', result: '성공', next: '10:40:00', on: true },
  { id: 'KMA-WRN-03', name: '기상특보 수신', item: '기상특보', target: '기상청', dir: '수신', every: '5분', last: '10:30:00', result: '실패', next: '10:40:00', on: true },
  { id: 'SV-RSN-001', name: '노면센서 계측값 수신', item: '노면센서 계측값', target: '스마트빌리지 인프라', dir: '수신', every: '1분', last: '10:35:00', result: '성공', next: '10:36:00', on: true },
  { id: 'JDH-SNW-01', name: '제설 작업 현황 송신', item: '제설 작업 현황', target: '제주데이터허브', dir: '송신', every: '30분', last: '10:30:00', result: '성공', next: '11:00:00', on: true },
  { id: 'KMA-VSRT-02', name: '초단기예보 수신', item: '초단기예보', target: '기상청', dir: '수신', every: '30분', last: '10:30:00', result: '성공', next: '11:00:00', on: true },
  { id: 'SV-CCTV-004', name: '적설 감시 CCTV 상태 수신', item: 'CCTV 상태', target: '스마트빌리지 인프라', dir: '수신', every: '5분', last: '10:35:00', result: '성공', next: '10:40:00', on: true },
  { id: 'SV-GPS-002', name: '제설차량 위치·궤적 수신', item: '차량 GPS 궤적', target: '스마트빌리지 인프라', dir: '수신', every: '1분', last: '10:35:00', result: '부분 성공', next: '10:36:00', on: true },
  { id: 'SV-SALT-003', name: '제설제 농도 계측값 수신', item: '제설제 농도', target: '스마트빌리지 인프라', dir: '수신', every: '10분', last: '10:30:00', result: '성공', next: '10:40:00', on: true },
  { id: 'SV-RFZ-005', name: '재결빙 위험 구간 수신', item: '재결빙 위험 구간', target: '스마트빌리지 인프라', dir: '수신', every: '15분', last: '10:30:00', result: '성공', next: '10:45:00', on: true },
  { id: 'JDH-HZD-02', name: '위험요소 조치 결과 송신', item: '위험요소 조치 결과', target: '제주데이터허브', dir: '송신', every: '1시간', last: '10:00:00', result: '성공', next: '11:00:00', on: true },
  { id: 'KMA-SFC-04', name: '지상관측 일자료 수신', item: '지상관측 일자료', target: '기상청', dir: '수신', every: '1일', last: '00:10:00', result: '성공', next: '익일 00:10:00', on: false },
  { id: 'JDH-RPT-03', name: '일일 제설 보고 송신', item: '일일 제설 보고', target: '제주데이터허브', dir: '송신', every: '1일', last: '06:00:00', result: '성공', next: '익일 06:00:00', on: false },
]

// 수신·송신 이력 — 시안 4건 + 최근 3일치 자동 생성
const DESIGN_RECV = [
  { no: 1248, at: '2026-10-19 10:35:00', batch: 'SV-RSN-001', count: 1240, took: '2.1s', result: '성공', err: '' },
  { no: 1245, at: '2026-10-19 10:30:00', batch: 'KMA-WRN-03', count: 0, took: '30.0s', result: '실패', err: '응답 시간 초과 (30s)' },
  { no: 1244, at: '2026-10-19 10:25:00', batch: 'SV-RSN-001', count: 1198, took: '2.6s', result: '부분 성공', err: '센서 42개소 결측' },
  { no: 1243, at: '2026-10-19 10:20:00', batch: 'KMA-WRN-03', count: 3, took: '1.1s', result: '재처리 성공', err: '10:15 실패분 재수신' },
]
const pad = (n) => String(n).padStart(2, '0')
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const hms = (d) => d.toTimeString().slice(0, 8)

const ERRORS = ['응답 시간 초과 (30s)', '인증 토큰 만료', '대상 서버 503 응답', '스키마 검증 실패 (필드 누락)']

function generate(dir, startNo, count) {
  const r = rng(`hist|${dir}`)
  const batches = INITIAL_BATCHES.filter((b) => b.dir === dir)
  const base = new Date(`${MOCK_TODAY}T10:15:00`)
  return Array.from({ length: count }, (_, i) => {
    const b = batches[Math.floor(r() * batches.length)]
    const t = new Date(base.getTime() - i * (dir === '수신' ? 23 : 71) * 60000)
    const x = r()
    const result = x < 0.08 ? '실패' : x < 0.13 ? '부분 성공' : x < 0.16 ? '재처리 성공' : '성공'
    const n = result === '실패' ? 0 : Math.round((dir === '수신' ? 200 : 10) + r() * (dir === '수신' ? 1100 : 30))
    return {
      no: startNo - i, at: `${ymd(t)} ${hms(t)}`, batch: b.id, count: n,
      took: result === '실패' ? '30.0s' : `${(0.5 + r() * 3).toFixed(1)}s`, result,
      err: result === '실패' ? ERRORS[Math.floor(r() * ERRORS.length)] : result === '부분 성공' ? `계측 ${Math.round(5 + r() * 40)}건 결측` : result === '재처리 성공' ? '직전 실패분 재처리' : '',
    }
  })
}

const INITIAL_HISTORY = {
  수신: [...DESIGN_RECV, ...generate('수신', 1242, 150)],
  송신: [
    { no: 512, at: '2026-10-19 10:30:00', batch: 'JDH-SNW-01', count: 26, took: '0.8s', result: '성공', err: '' },
    { no: 511, at: '2026-10-19 10:00:00', batch: 'JDH-HZD-02', count: 14, took: '0.6s', result: '성공', err: '' },
    { no: 510, at: '2026-10-19 09:30:00', batch: 'JDH-SNW-01', count: 0, took: '15.0s', result: '실패', err: '인증 토큰 만료' },
    ...generate('송신', 509, 50),
  ],
}

export const batchStore = createStore('jeju-snow.batches.v1', INITIAL_BATCHES)
export const historyStore = createStore('jeju-snow.history.v1', INITIAL_HISTORY)
export const batchById = (id) => batchStore.get().find((b) => b.id === id)
