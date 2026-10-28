import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Dropdown } from '../../components/Controls.jsx'
import {
  ACTION_BADGE, HAZARD_DAILY, HAZARD_LABELS, HAZARD_RECENT, JURISDICTIONS, JUR_DATA, REGION_RISK, RISK_GRADE, SNOW_STATUS_KEYS, weatherAt,
} from '../../data/dashboard.js'
import HazardList from './HazardList.jsx'

// 재결빙 위험 '지도 보기' 대상 구간 (관할별 최우선 구간)
const TOP_SEG = { 전체: 'K-12', 도청: 'K-12', 제주시: 'B-4', 서귀포시: 'N-3' }

// UI-SIRS-001-01 종합 현황 패널 (⑨~⑫)
export default function DashboardPanel({ region, onShowSegment, onShowPlace }) {
  const { openAlerts } = useOutletContext()
  const [jur, setJur] = useState('전체')
  const d = JUR_DATA[jur]
  const total = d.status.reduce((s, n) => s + n, 0)
  const done = d.status[3]
  const risk = REGION_RISK[jur]
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
      <HazardList onShowPlace={onShowPlace} />

      <hr />
      <div className="dp__sec">
        <div className="dp__head">
          <p className="section-title">기상 현황</p>
          <small>{region} · 현재</small>
        </div>
        <div className="mini-cards">
          {weatherAt(region).map((w) => (
            <div key={w.label}>
              <small>{w.label}</small>
              <p><b>{w.value}</b><span>{w.unit}</span></p>
            </div>
          ))}
        </div>
        {/* 도로 위험 발생 가능성 · 권역별 */}
        <div className="risk-card">
          <div className="risk-card__head">
            <span>도로 위험 발생 가능성 · 권역별</span>
            <span className="risk-card__total">종합 <GradeBadge grade={risk.total.grade}>{risk.total.grade} {risk.total.prob}%</GradeBadge></span>
          </div>
          <div className="risk-card__row risk-card__row--th">
            <span>권역</span><span>기온</span><span>가능성</span><span>등급</span>
          </div>
          {risk.rows.map((r) => (
            <div key={r.name} className="risk-card__row">
              <span className="risk-card__name"><b>{r.name}</b><small>{r.sub}</small></span>
              <span className={r.temp < 0 ? 'cold' : ''}>{r.temp.toFixed(1)}℃</span>
              <span className="risk-card__prob">
                <i><i style={{ width: `${r.prob}%`, background: RISK_GRADE[r.grade].bar }} /></i>
                <b>{r.prob}%</b>
              </span>
              <span><GradeBadge grade={r.grade}>{r.grade}</GradeBadge></span>
            </div>
          ))}
        </div>
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

function GradeBadge({ grade, children }) {
  const c = RISK_GRADE[grade]
  return <em className="grade-badge" style={{ color: c.text, background: c.bg }}>{children}</em>
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
