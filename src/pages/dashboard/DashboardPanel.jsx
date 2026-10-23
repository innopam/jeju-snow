import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Dropdown } from '../../components/Controls.jsx'
import { ACTION_BADGE, HAZARD_DAILY, HAZARD_RECENT, HAZARD_TYPES, SENSORS, SNOW_STATUS, WEATHER_NOW } from '../../data/dashboard.js'

const JURISDICTIONS = ['전체', '제주시', '서귀포시']

export default function DashboardPanel({ onShowSegment }) {
  const { openAlerts } = useOutletContext()
  const [jur, setJur] = useState('전체')
  const total = SNOW_STATUS.reduce((s, x) => s + x.count, 0)
  const done = SNOW_STATUS.find((x) => x.key === '완료').count
  const sensorSum = SENSORS.reduce((s, r) => ({ total: s.total + r.total, ok: s.ok + r.ok, bad: s.bad + r.bad, miss: s.miss + r.miss }), { total: 0, ok: 0, bad: 0, miss: 0 })

  return (
    <div className="dp">
      <div className="dp__head">
        <p className="section-title">제설 현황</p>
        <Dropdown value={jur} options={JURISDICTIONS} onChange={setJur} width={80} />
      </div>
      <div className="stat-split">
        {SNOW_STATUS.map((s) => (
          <div key={s.key}>
            <p><i style={{ background: s.color }} />{s.key}</p>
            <p><b>{s.count}</b><small>구간</small></p>
          </div>
        ))}
      </div>
      <div className="stack-bar">
        <div>
          {SNOW_STATUS.map((s) => (
            <i key={s.key} style={{ background: s.color, flex: s.key === '완료' ? 1 : 'none', width: s.key === '완료' ? undefined : `${(s.count / total) * 100 * 0.84}%` }} title={`${s.key} ${s.count}구간`} />
          ))}
        </div>
        <b>완료율 {Math.round((done / total) * 100)}%</b>
      </div>
      <div className="warn-banner">
        <div>
          <span className="warn-banner__ic">!</span>
          <div className="warn-banner__txt">
            <p><b>재결빙 위험 5구간</b><em>조치 필요</em></p>
            <small>최우선 K-12 1100도로 · 10:40 재결빙 예상</small>
          </div>
          <button onClick={onShowSegment}>지도 보기 ›</button>
        </div>
        <div>
          <span className="warn-banner__ic">!</span>
          <div className="warn-banner__txt">
            <p><b>작업 누락 의심 6구간</b><em>미조치</em></p>
            <small>최장 5·16도로 교래 · 위험 발생 후 4h 미조치</small>
          </div>
          <button onClick={openAlerts}>목록 보기 ›</button>
        </div>
      </div>

      <hr />
      <div className="dp__sec">
        <div className="dp__head">
          <p className="section-title">기상 현황</p>
          <small>대정읍 · 10:30 발표</small>
        </div>
        <div className="mini-cards">
          {WEATHER_NOW.map((w) => (
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
          <small>3종 · 60대</small>
        </div>
        <table className="sensor-table">
          <thead>
            <tr><th>센서 유형</th><th>전체</th><th>정상</th><th>이상</th><th>미수신</th></tr>
          </thead>
          <tbody>
            {[...SENSORS, { type: '합계', ...sensorSum }].map((r) => (
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
          {HAZARD_TYPES.map((h) => (
            <div key={h.label}>
              <small>{h.label}</small>
              <p><b>{h.count}</b><span>건</span><span className="muted"> · 완료 {h.done}</span></p>
            </div>
          ))}
        </div>
        <DailyBars />
        <div className="bar-legend">
          <span><i style={{ background: '#168e79' }} />조치 완료</span>
          <span><i style={{ background: '#d94b68' }} />미완료 (미조치·조치중)</span>
        </div>
        <ul className="recent">
          {HAZARD_RECENT.map((r) => (
            <li key={r.time}>
              <small>{r.time}</small>
              <b>{r.type}</b>
              <span>{r.place}</span>
              <em className="badge" style={{ background: ACTION_BADGE[r.state] }}>{r.state}</em>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function DailyBars() {
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
        {HAZARD_DAILY.map((d) => (
          <div key={d.d} className="daily__col" title={`${d.d} · 완료 ${d.done} / 미완료 ${d.todo}`}>
            <div className="daily__stack">
              {d.todo > 0 && <i style={{ height: px(d.todo), background: d.d === '오늘' ? '#d94b68' : 'rgba(217,75,104,0.55)' }} />}
              <i style={{ height: px(d.done), background: '#168e79' }} />
            </div>
            <small className={d.d === '오늘' ? 'today' : ''}>{d.d}</small>
          </div>
        ))}
      </div>
    </div>
  )
}
