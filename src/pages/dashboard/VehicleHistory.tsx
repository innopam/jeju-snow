import { useEffect, useMemo, useState } from 'react'
import type { MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { A } from '../../assets'
import Icon from '../../components/Icon'
import { VEHICLE_STATUS } from '../../data/dashboard'
import type { Vehicle } from '../../data/dashboard'
import { SECTIONS } from './WorkOrder'
import type { WorkOrderData } from './WorkOrder'

// UI-001-04-02·04·05 차량 현황 조회 — 진행 중인 작업(또는 작업 지시) · 작업 이력(저장 영상) 펼쳐 재생 · 크게 보기
const DAY = ['일', '월', '화', '수', '목', '금', '토']
// 시안의 11호차 이력 (일자 · 시작 · 끝 · 길이(초) · 노선 · 운행 상태 · 속도)
const DESIGN_LOG: [date: string, from: string, to: string, sec: number, road: string, state: string, speed: number][] = [
  ['2026-11-04', '14:32', '14:47', 912, '평화로', '제설 중', 32],
  ['2026-11-04', '11:05', '11:38', 1984, '평화로', '제설 중', 28],
  ['2026-11-04', '07:20', '07:52', 1930, '1100도로', '제설 중', 24],
  ['2026-11-03', '22:14', '22:41', 1650, '5·16도로', '제설 중', 26],
  ['2026-11-03', '16:48', '17:02', 862, '평화로', '이동', 45],
  ['2026-11-03', '09:10', '09:44', 2058, '번영로', '제설 중', 30],
  ['2026-11-02', '20:30', '21:02', 1925, '산록도로', '제설 중', 22],
  ['2026-11-02', '13:15', '13:28', 820, '평화로', '이동', 48],
  ['2026-11-01', '06:05', '06:40', 2102, '1100도로', '제설 중', 25],
  ['2026-10-31', '23:40', '00:12', 1931, '5·16도로', '제설 중', 27],
  ['2026-10-31', '18:22', '18:51', 1787, '평화로', '제설 중', 29],
  ['2026-10-30', '05:50', '06:21', 1886, '번영로', '제설 중', 31],
]
const ROADS = ['평화로', '1100도로', '5·16도로', '번영로', '산록도로', '비자림로', '남조로']
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 9973, 7)
const mmss = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`

// 차량별 이력 — 시안 이력을 바탕으로 차량마다 노선을 바꿔 만든다 (목업)
export function historyOf(vehicle: Vehicle) {
  const h = hash(vehicle.name)
  const home = vehicle.info.split(' · ')[0]
  return DESIGN_LOG.map(([date, from, to, sec, road, state, speed], i) => {
    const r = i === 0 && ROADS.includes(home) ? home : vehicle.name === '11호차' ? road : ROADS[(ROADS.indexOf(road) + h) % ROADS.length]
    const d = new Date(`${date}T00:00:00`)
    return { id: i, date: date.replaceAll('-', '.'), day: `${DAY[d.getDay()]}요일`, from, to, sec, road: r, state, speed, video: i !== 1 }
  })
}

type HistoryRec = ReturnType<typeof historyOf>[number]

// 작업 단계 — Done=체크 · Current=4px 링 · Upcoming=회색 번호 (Figma Step Item)
function Steps({ steps }: { steps: [label: string, sub: string, state: 'done' | 'current' | 'upcoming'][] }) {
  return (
    <div className="steps">
      {steps.map(([label, sub, st], i) => (
        <div key={label} className={`steps__item ${st}`}>
          <span className="steps__dot">{st === 'done' ? <Icon name="check" size={10} /> : st === 'upcoming' ? i + 1 : null}</span>
          <b>{label}</b>
          <small>{sub}</small>
        </div>
      ))}
    </div>
  )
}

interface VehicleHistoryProps {
  vehicle: Vehicle
  order?: WorkOrderData // 이 화면에서 보낸 작업 지시 (목업)
  onBack: () => void
  onOrder: () => void
}
export default function VehicleHistory({ vehicle, order, onBack, onOrder }: VehicleHistoryProps) {
  const list = useMemo(() => historyOf(vehicle), [vehicle])
  const [open, setOpen] = useState<number | null>(() => (vehicle.status === 'working' ? 0 : null))
  const [big, setBig] = useState<HistoryRec | null>(null)
  const working = vehicle.status === 'working'
  const st = VEHICLE_STATUS[vehicle.status]
  const [road, speed] = vehicle.info.split(' · ')
  const section = vehicle.name === '11호차' ? '1100도로 · 성판악 (K-12)' : (SECTIONS[road]?.[0] ?? road).replace(' ~ ', ' · ')

  return (
    <div className="vh">
      <div className="vh__head">
        <button className="vh__back" onClick={onBack} aria-label="차량 목록으로">
          <Icon name="chevron-left" />
        </button>
        <b>{vehicle.name}</b>
        <span className="vh__type">{vehicle.type}</span>
        {working && <span className={`grade grade--${st.tone}`}><i />{st.label}</span>}
      </div>

      {working ? (
        <div className="vh__now vh__now--work">
          <div className="vh__now-top">
            <b>진행 중인 작업</b>
          </div>
          <strong>{section}</strong>
          <small>기사 김제설 · {/km\/h/.test(speed ?? '') ? speed : '수신 지연'} · 진행 2.1 / 4.2km</small>
          <Steps steps={[['지시', '14:20:08', 'done'], ['제설 시작', '14:32:05', 'done'], ['제설 종료', '진행 중 · 18분째', 'current']]} />
          <small>전달 메모 : 성판악 구간 노면 결빙. 제설제 살포 병행 바랍니다.</small>
        </div>
      ) : order ? (
        <div className="vh__now vh__now--work">
          <div className="vh__now-top">
            <b>지시한 작업</b>
            <span className="pbadge tone-etc">{order.kind} · {order.priority}</span>
          </div>
          <strong>{order.sections.join(', ')}</strong>
          <Steps steps={[['지시', order.at, 'done'], [`${order.kind} 시작`, '대기 중', 'current'], [`${order.kind} 종료`, '-', 'upcoming']]} />
          {order.memo && <small>전달 메모 : {order.memo}</small>}
        </div>
      ) : (
        <div className="vh__now">
          <b>진행 중인 작업이 없습니다</b>
          <button className="btn btn--primary" onClick={onOrder}>작업 지시</button>
        </div>
      )}

      <div className="vh__th">
        <span className="c-date">일자</span>
        <span className="c-time">시간</span>
        <span className="c-info">운행 정보</span>
        <span className="c-chev" />
      </div>
      <div className="vh__list">
        {list.map((r) => {
          const on = open === r.id
          // 진행 중인 작업(맨 위)만 "제설 중", 지난 작업은 "제설 완료"
          const state = r.state === '제설 중' && !(working && r.id === 0) ? '제설 완료' : r.state
          return (
            <div key={r.id} className={`vh-item${on ? ' on' : ''}`}>
              {/* 저장 영상이 없는 작업도 선택(푸른 배경)은 되고, 펼침(플레이어)만 없다 */}
              <button className="vh-row" onClick={() => setOpen(on ? null : r.id)} aria-expanded={r.video ? on : undefined} aria-pressed={on}>
                <span className="c-date"><b>{r.date}</b><small>{r.day}</small></span>
                <span className="c-time"><b>{r.from} ~ {r.to}</b><small>{Math.floor(r.sec / 60)}분 {String(r.sec % 60).padStart(2, '0')}초</small></span>
                <span className="c-info"><b>{r.road}</b><small>{state} · {r.speed}km/h</small></span>
                {r.video ? <img className="c-chev" src={on ? A.icChevronUp18 : A.icChevronDown18} alt="" /> : <span className="c-chev" />}
              </button>
              {on && r.video && (
                <div className="vh-play">
                  <VideoPlayer key={r.id} duration={r.sec} onExpand={() => setBig(r)} />
                  <small className="vh-play__info">녹화영상 정보 : {r.road}~{r.road} {r.from}:05 ~ {r.to}:17</small>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {big && (
        <VideoModal
          title={`${vehicle.name} (${vehicle.type}) · ${big.date} ${big.from} ~ ${big.to} · ${big.road}`}
          duration={big.sec}
          onClose={() => setBig(null)}
        />
      )}
    </div>
  )
}

// 영상 플레이어 — 진행 중인 작업에 실시간 영상이 있으면 vplayer__screen 에 표출(연동 미정), 저장 영상은 일시정지 상태로 열리고, 재생하면 진행 막대가 움직인다 (목업: 영상 대신 화면 그라데이션)
export function VideoPlayer({ duration, onExpand }: { duration: number; onExpand?: () => void }) {
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState(0)
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => setPos((p) => (p + 1 >= duration ? (setPlaying(false), duration) : p + 1)), 1000)
    return () => clearInterval(t)
  }, [playing, duration])
  const pct = (pos / duration) * 100
  const seek = (e: MouseEvent<HTMLSpanElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    setPos(Math.round(Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)) * duration))
  }

  return (
    <div className={`vplayer${playing ? ' playing' : ''}`}>
      <div className="vplayer__screen" onClick={() => setPlaying((p) => !p)}>
        {!playing && (
          <span className="vplayer__big" aria-hidden>
            <img src={A.icPlayBrand} alt="" />
          </span>
        )}
      </div>
      <div className="vplayer__bar">
        <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? '일시정지' : '재생'}>
          {playing ? <span className="vplayer__pause" /> : <img src={A.icPlayWhite} alt="" />}
        </button>
        <span className="vplayer__t">{mmss(pos)}</span>
        <span className="vplayer__track" onClick={seek}>
          <i style={{ width: `${pct}%` }} />
          <img src={A.icHandle} alt="" style={{ left: `calc(${pct}% - ${(pct / 100) * 12}px)` }} />
        </span>
        <span className="vplayer__t dim">{mmss(duration)}</span>
        {onExpand && (
          <button onClick={onExpand} aria-label="크게 보기">
            <img src={A.icExpand} alt="" />
          </button>
        )}
      </div>
    </div>
  )
}

// 팝업 · 영상 크게 보기 (UI-001-04-03) — 닫기(✕) 또는 ESC 시 목록으로 복귀
export function VideoModal({ title, duration, onClose }: { title: string; duration: number; onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  return createPortal(
    <div className="vmodal-dim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="vmodal" role="dialog" aria-modal="true" aria-label="영상 크게 보기">
        <div className="vmodal__head">
          <b>{title}</b>
          <button onClick={onClose} aria-label="닫기"><Icon name="close" /></button>
        </div>
        <div className="vmodal__body">
          <VideoPlayer duration={duration} />
        </div>
      </div>
    </div>,
    document.body,
  )
}
