import { useMemo, useState } from 'react'
import { A } from '../../assets.js'
import { Dropdown } from '../../components/Controls.jsx'
import { JURISDICTIONS, VEHICLES, VEHICLE_STATUS } from '../../data/dashboard.js'

// UI-SIRS-001-04 대시보드 – 제설 차량 현황
const TYPES = ['전체', '유니목', '임차', '덤프', '다목적']
const STATUS_SPLIT = [
  { key: null, label: '전체', color: '#222' },
  { key: 'working', label: '제설 중', color: '#fcbe2d' },
  { key: 'standby', label: '대기', color: '#3979ee' },
  { key: 'done', label: '종료', color: '#9198a5' },
]
const STATUS_ORDER = { working: 0, standby: 1, done: 2 }
const isAbnormal = (v) => v.battery <= 20 || v.delayed // 단말 이상: 배터리 20% 이하·수신 지연

export default function VehiclePanel({ selected, onSelect }) {
  const [jur, setJur] = useState('전체')
  const [type, setType] = useState('전체')
  const [status, setStatus] = useState(null)
  const [abnormal, setAbnormal] = useState(false)
  const [query, setQuery] = useState('')

  const inJur = useMemo(() => VEHICLES.map((v, i) => ({ ...v, i })).filter((v) => jur === '전체' || v.jur === jur), [jur])
  const list = useMemo(
    () =>
      inJur
        .filter(
          (v) =>
            (type === '전체' || v.type === type) &&
            (!status || v.status === status) &&
            (!abnormal || isAbnormal(v)) &&
            (!query.trim() || v.name.includes(query.trim()) || v.info.includes(query.trim())),
        )
        .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]),
    [inJur, type, status, abnormal, query],
  )
  const lowBattery = inJur.filter((v) => v.battery <= 20).length
  const delayed = inJur.filter((v) => v.delayed).length

  return (
    <div className="vp">
      <div className="dp__head">
        <p className="section-title">차량 운행 현황</p>
        <Dropdown value={jur} options={JURISDICTIONS} onChange={setJur} width={110} />
      </div>
      <div className="stat-split">
        {STATUS_SPLIT.map((s) => (
          <button key={s.label} className={status === s.key && s.key ? 'on' : ''} onClick={() => setStatus(s.key)} aria-pressed={status === s.key}>
            <p><i style={{ background: s.color }} />{s.label}</p>
            <p><b>{s.key ? inJur.filter((v) => v.status === s.key).length : inJur.length}</b><small>대</small></p>
          </button>
        ))}
      </div>
      {lowBattery + delayed > 0 && (
        <button className={`device-alert${abnormal ? ' on' : ''}`} onClick={() => setAbnormal((a) => !a)} aria-pressed={abnormal}>
          <img src={A.alertDot} alt="" />
          <span>배터리 부족 {lowBattery}대 · 통신 지연 {delayed}대</span>
          <em>{abnormal ? '전체 보기 ›' : '목록 보기 ›'}</em>
        </button>
      )}

      <hr />
      <div className="vp__list-sec">
        <p className="section-title">차량 목록</p>
        <label className="search search--sm">
          <img src={A.icSearch18} alt="" />
          <input placeholder="차량번호 · 호차 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="type-chips">
          {TYPES.map((t) => (
            <button key={t} className={type === t ? 'on' : ''} onClick={() => setType(t)} aria-pressed={type === t}>
              {t}
              <span>{t === '전체' ? inJur.length : inJur.filter((v) => v.type === t).length}</span>
            </button>
          ))}
        </div>
        <div className="vlist-head">
          <span style={{ width: 46, textAlign: 'center' }}>차종</span>
          <span style={{ flex: 1 }}>차량 · 운행 정보</span>
          <span style={{ width: 52, textAlign: 'center' }}>상태</span>
          <span style={{ width: 50, textAlign: 'center' }}>배터리</span>
          <span style={{ width: 28, textAlign: 'center' }}>영상</span>
        </div>
        <div className="vlist">
          {list.map((v) => {
            const st = VEHICLE_STATUS[v.status]
            const low = v.battery <= 20
            const isSel = selected === v.i
            return (
              <div key={v.i} className={`vrow${isSel ? ' sel' : ''}`} onClick={() => onSelect(v.i)}>
                <span className="vrow__type">{v.type}</span>
                <span className="vrow__info">
                  <b>{v.name}</b>
                  <small style={{ color: v.delayed ? '#dc7200' : undefined }}>{v.info}</small>
                </span>
                <span className="vrow__st" style={{ background: st.bg, color: st.fg }}>
                  <img src={st.dot} alt="" />
                  {st.label}
                </span>
                <span className="vrow__bat" title={low ? '배터리 20% 이하' : undefined}>
                  <i><i style={{ width: Math.max(1, (v.battery / 100) * 12), background: low ? '#d92338' : '#16a05d' }} /></i>
                  <small style={{ color: low ? '#d92338' : undefined }}>{v.battery}%</small>
                </span>
                <button
                  className={`vrow__video${isSel ? ' on' : ''}`}
                  disabled={v.status === 'done'}
                  title={v.status === 'done' ? '운행 종료 차량은 영상을 볼 수 없습니다' : '실시간 영상 보기'}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelect(v.i)
                  }}
                  aria-label="영상 보기"
                >
                  <img src={isSel ? A.icVideoWhite : A.icVideo} alt="" />
                </button>
              </div>
            )
          })}
          {list.length === 0 && <p className="vlist-empty">조건에 맞는 차량이 없습니다.</p>}
        </div>
      </div>
    </div>
  )
}
