import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Dropdown } from '../../components/Controls.jsx'
import {
  ACTION_BADGE, HAZARD_DAILY, HAZARD_LABELS, HAZARD_RECENT, JURISDICTIONS, JUR_DATA, SENSOR_TYPES, SNOW_STATUS_KEYS, weatherAt,
} from '../../data/dashboard.js'

// 재결빙 위험 '지도 보기' 대상 구간 (관할별 최우선 구간)
const TOP_SEG = { 전체: 'K-12', 도청: 'K-12', 제주시: 'B-4', 서귀포시: 'N-3' }

// UI-SIRS-001-01 종합 현황 패널 (⑨~⑫)
export default function DashboardPanel({ region, onShowSegment }) {
  const { openAlerts } = useOutletContext()
  const [jur, setJur] = useState('전체')
  const d = JUR_DATA[jur]
  const total = d.status.reduce((s, n) => s + n, 0)
  const done = d.status[3]
  const sensorRows = SENSOR_TYPES.map((type, i) => {
    const [t, ok, bad, miss] = d.sensors[i]
    return { type, total: t, ok, bad, miss }
  })
  const sum = sensorRows.reduce((s, r) => ({ total: s.total + r.total, ok: s.ok + r.ok, bad: s.bad + r.bad, miss: s.miss + r.miss }), { total: 0, ok: 0, bad: 0, miss: 0 })
  const recent = HAZARD_RECENT.filter((r) => jur === '전체' || r.jur === jur).slice(0, 3)
  const scale = jur === '전체' ? 1 : d.hazards.reduce((s, h) => s + h[0], 0) / JUR_DATA.전체.hazards.reduce((s, h) => s + h[0], 0)

  return (
    <div className="dp">
      <div className="dp__head">
        <p className="section-title">제설 현황</p>
        <Dropdown value={jur} options={JURISDICTIONS} onChange={setJur} width={110} />
      </div>
      <div className="stat-split">
        {SNOW_STATUS_KEYS.map((s, i) => (
          <div key={s.key}>
            <p><i style={{ background: s.color }} />{s.key}</p>
            <p><b>{d.status[i]}</b><small>구간</small></p>
          </div>
        ))}
      </div>
      <div className="stack-bar">
        <div>
          {SNOW_STATUS_KEYS.map((s, i) =>
            d.status[i] > 0 ? <i key={s.key} style={{ background: s.color, flex: d.status[i] }} title={`${s.key} ${d.status[i]}구간`} /> : null,
          )}
        </div>
        <b>완료율 {total ? Math.round((done / total) * 100) : 0}%</b>
      </div>
      <div className="warn-banner">
        <div>
          <span className="warn-banner__ic">!</span>
          <div className="warn-banner__txt">
            <p><b>재결빙 위험 {d.refreeze}구간</b><em>조치 필요</em></p>
            <small>최우선 {d.refreezeTop}</small>
          </div>
          <button onClick={() => onShowSegment(TOP_SEG[jur])}>지도 보기 ›</button>
        </div>
        <div>
          <span className="warn-banner__ic">!</span>
          <div className="warn-banner__txt">
            <p><b>작업 누락 의심 {d.missing}구간</b><em>미조치</em></p>
            <small>최장 {d.missingTop}</small>
          </div>
          <button data-open-alerts onClick={() => openAlerts('미조치')}>목록 보기 ›</button>
        </div>
      </div>

      <hr />
      <div className="dp__sec">
        <div className="dp__head">
          <p className="section-title">기상 현황</p>
          <small>{region} · 10:30 발표</small>
        </div>
        <div className="mini-cards">
          {weatherAt(region).map((w) => (
            <div key={w.label}>
              <small>{w.label}</small>
              <p><b>{w.value}</b><span>{w.unit}</span></p>
            </div>
          ))}
        </div>
      </div>

      <hr />
      <div className="dp__sec">
        <div className="dp__head">
          <p className="section-title">센서 데이터</p>
          <small>3종 · {sum.total}대</small>
        </div>
        <table className="sensor-table">
          <thead>
            <tr><th>센서 유형</th><th>전체</th><th>정상</th><th>이상</th><th>미수신</th></tr>
          </thead>
          <tbody>
            {[...sensorRows, { type: '합계', ...sum }].map((r) => (
              <tr key={r.type} className={r.type === '합계' ? 'sum' : ''}>
                <td>{r.type}</td>
                <td>{r.total}</td>
                <td>{r.ok}</td>
                <td className={r.bad ? 'warn' : 'zero'}>{r.bad}</td>
                <td className={r.miss ? 'err' : 'zero'}>{r.miss}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <hr />
      <div className="dp__sec">
        <div className="dp__head">
          <p className="section-title">위험요소 조치 내역</p>
          <small>최근 7일</small>
        </div>
        <div className="mini-cards">
          {HAZARD_LABELS.map((label, i) => (
            <div key={label}>
              <small>{label}</small>
              <p><b>{d.hazards[i][0]}</b><span>건</span><span className="muted"> · 완료 {d.hazards[i][1]}</span></p>
            </div>
          ))}
        </div>
        <DailyBars scale={scale} />
        <div className="bar-legend">
          <span><i style={{ background: '#168e79' }} />조치 완료</span>
          <span><i style={{ background: '#d94b68' }} />미완료 (미조치·조치중)</span>
        </div>
        <ul className="recent">
          {recent.map((r) => (
            <li key={r.time}>
              <small>{r.time}</small>
              <b>{r.type}</b>
              <button onClick={() => onShowSegment(r.seg)} title="지도에서 보기">{r.place}</button>
              <em className="badge" style={{ background: ACTION_BADGE[r.state] }}>{r.state}</em>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function DailyBars({ scale }) {
  const H = 62 // 0~30 → 62px
  const px = (n) => (n / 30) * H
  return (
    <div className="daily">
      {[0, 15, 30].map((t) => (
        <div key={t} className="daily__grid" style={{ top: H - px(t) }}>
          <small>{t}</small>
        </div>
      ))}
      <div className="daily__bars">
        {HAZARD_DAILY.map((d) => {
          const done = Math.round(d.done * scale)
          const todo = Math.round(d.todo * scale)
          return (
            <div key={d.d} className="daily__col" title={`${d.d} · 완료 ${done}건 / 미완료 ${todo}건`}>
              <div className="daily__stack">
                {todo > 0 && <i style={{ height: px(todo), background: d.d === '오늘' ? '#d94b68' : 'rgba(217,75,104,0.55)' }} />}
                <i style={{ height: px(done), background: '#168e79' }} />
              </div>
              <small className={d.d === '오늘' ? 'today' : ''}>{d.d}</small>
            </div>
          )
        })}
      </div>
    </div>
  )
}
