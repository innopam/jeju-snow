import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Dropdown, EmptyState, SearchField } from '../../components/Controls'
import type { LayoutContext } from '../../components/Layout'
import { JURISDICTIONS, VEHICLES, VEHICLE_STATUS } from '../../data/dashboard'
import VehicleHistory, { VideoModal, historyOf } from './VehicleHistory'
import WorkOrder from './WorkOrder'
import type { WorkOrderData } from './WorkOrder'

// UI-SIRS-001-04 대시보드 – 제설 차량 현황
const TYPES = ['전체', '유니목', '임차', '덤프', '다목적']
const STATUS_SPLIT: { key: string | null; label: string; color: string }[] = [
  { key: null, label: '전체', color: '#222' },
  { key: 'working', label: '제설 중', color: '#fcbe2d' },
  { key: 'standby', label: '대기', color: '#3979ee' },
  { key: 'done', label: '종료', color: '#9198a5' },
]
const STATUS_ORDER: Record<string, number> = { working: 0, standby: 1, done: 2 }

export default function VehiclePanel({ selected, onSelect }: { selected: number | null; onSelect: (i: number) => void }) {
  const [jur, setJur] = useState('전체')
  const [type, setType] = useState('전체')
  const [status, setStatus] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [history, setHistory] = useState<number | null>(null) // 차량 현황(작업 · 저장 영상)을 보는 차량 번호
  const [ordering, setOrdering] = useState(false) // 작업 지시 양식
  const [live, setLive] = useState(false) // 실시간 영상 팝업
  const [orders, setOrders] = useState<Record<string, WorkOrderData>>({}) // 보낸 작업 지시 (목업)
  const { setToast } = useOutletContext<Partial<LayoutContext> | undefined>() ?? {}
  useEffect(() => {
    setHistory(null) // 지도에서 다른 차량을 고르면 목록으로
    setOrdering(false)
  }, [selected])

  const inJur = useMemo(() => VEHICLES.map((v, i) => ({ ...v, i })).filter((v) => jur === '전체' || v.jur === jur), [jur])
  const list = useMemo(
    () =>
      inJur
        .filter(
          (v) =>
            (type === '전체' || v.type === type) &&
            (!status || v.status === status) &&
            (!query.trim() || v.name.includes(query.trim()) || v.info.includes(query.trim())),
        )
        .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]),
    [inJur, type, status, query],
  )

  if (history != null) {
    const vh = VEHICLES[history]
    if (ordering)
      return (
        <WorkOrder
          vehicle={vh}
          pastRoads={historyOf(vh).map((r) => r.road)}
          onCancel={() => setOrdering(false)}
          onSend={(o) => {
            setOrders((m) => ({ ...m, [vh.name]: o }))
            setOrdering(false)
            setToast?.(`${vh.name}에 작업 지시를 보냈습니다. 제설 작업 모바일로 전달됩니다 (목업).`)
          }}
        />
      )
    return (
      <>
        <VehicleHistory
          key={vh.name}
          vehicle={vh}
          order={orders[vh.name]}
          onBack={() => setHistory(null)}
          onOrder={() => setOrdering(true)}
          onLive={() => setLive(true)}
        />
        {live && <VideoModal title={`${vh.name} (${vh.type}) · 실시간 영상 · ${vh.info.split(' · ')[0]}`} duration={3600} onClose={() => setLive(false)} />}
      </>
    )
  }

  return (
    <div className="vp">
      <div className="dp__head">
        <p className="section-title">차량 운행 현황</p>
        <Dropdown value={jur} options={JURISDICTIONS} onChange={setJur} width={110} size="sm" />
      </div>
      <div className="stat-split">
        {STATUS_SPLIT.map((s) => (
          <button key={s.label} className={status === s.key && s.key ? 'on' : ''} onClick={() => setStatus(s.key)} aria-pressed={status === s.key}>
            <p><i style={{ background: s.color }} />{s.label}</p>
            <p><b>{s.key ? inJur.filter((v) => v.status === s.key).length : inJur.length}</b><small>대</small></p>
          </button>
        ))}
      </div>

      <hr />
      <div className="vp__list-sec">
        <p className="section-title">차량 목록</p>
        <SearchField size="sm" placeholder="차량번호 · 호차 검색" value={query} onChange={setQuery} />
        {/* 차종 필터 — 디자인 가이드 Chips (component library Status/Icon Tab) */}
        <div className="chips type-chips" role="group" aria-label="차종 필터">
          {TYPES.map((t) => (
            <button key={t} type="button" className={type === t ? 'on' : ''} onClick={() => setType(t)} aria-pressed={type === t}>
              <span>{t}</span>
              <strong>{t === '전체' ? inJur.length : inJur.filter((v) => v.type === t).length}</strong>
            </button>
          ))}
        </div>
        <div className="vlist-head">
          <span style={{ width: 46, textAlign: 'center' }}>차종</span>
          <span style={{ flex: 1 }}>차량 · 운행 정보</span>
          <span style={{ width: 52, textAlign: 'center' }}>상태</span>
          <span style={{ width: 50, textAlign: 'center' }}>배터리</span>
          <span className="vlist-head__hist">작업<br />이력</span>
        </div>
        <div className="vlist">
          {list.map((v) => {
            const st = VEHICLE_STATUS[v.status]
            const low = v.battery <= 20
            const isSel = selected === v.i
            return (
              <div key={v.i} className={`vrow${isSel ? ' sel' : ''}`} onClick={() => onSelect(v.i)}>
                <span className="pbadge tone-etc vrow__type">{v.type}</span>
                <span className="vrow__info">
                  <b>{v.name}</b>
                  <small style={{ color: v.delayed ? '#dc7200' : undefined }}>{v.info}</small>
                </span>
                <span className={`grade grade--${st.tone} vrow__st`}><i />{st.label}</span>
                <span className="vrow__bat" title={low ? '배터리 20% 이하' : undefined}>
                  <i><i style={{ width: Math.max(1, (v.battery / 100) * 12), background: low ? '#d92338' : '#16a05d' }} /></i>
                  <small style={{ color: low ? '#d92338' : undefined }}>{v.battery}%</small>
                </span>
                {/* 작업이력 버튼 — 모든 행에 상시 표시 (Figma Icon/car 456:1045), 선택한 행은 채움 */}
                <button
                  className={`vrow__hist${isSel ? ' on' : ''}`}
                  title="작업 현황·이력 보기"
                  onClick={(e) => {
                    e.stopPropagation()
                    setHistory(v.i)
                  }}
                  aria-label={`${v.name} 작업 현황·이력 보기`}
                >
                  <i className="vrow__car" aria-hidden />
                </button>
              </div>
            )
          })}
          {list.length === 0 && <EmptyState message="조건에 맞는 차량이 없습니다." />}
        </div>
      </div>
    </div>
  )
}
