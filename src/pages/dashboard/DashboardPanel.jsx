import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Dropdown } from '../../components/Controls.jsx'
import { JURISDICTIONS, JUR_DATA, SNOW_STATUS_KEYS } from '../../data/dashboard.js'
import HazardList from './HazardList.jsx'

// 재결빙 위험 '지도 보기' 대상 구간 (관할별 최우선 구간)
const TOP_SEG = { 전체: 'K-12', 도청: 'K-12', 제주시: 'B-4', 서귀포시: 'N-3' }

// UI-SIRS-001-01 종합 현황 패널 (⑨~⑫)
export default function DashboardPanel({ onShowSegment, onShowPlace }) {
  const { openAlerts } = useOutletContext()
  const [jur, setJur] = useState('전체')
  const d = JUR_DATA[jur]
  const total = d.status.reduce((s, n) => s + n, 0)
  const done = d.status[3]

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
      <HazardList onShowPlace={onShowPlace} />
    </div>
  )
}
