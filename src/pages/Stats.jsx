import { useEffect, useMemo, useRef, useState } from 'react'
import { A } from '../assets.js'
import { Dropdown } from '../components/Controls.jsx'
import { DONG, GRADES, GRADE_COLORS, HAZARD_TYPES, SIDO, actionStats, fmtRange, occurrenceStats } from '../data/stats.js'
import './stats.css'

// UI-SIRS-002 통계 — UC-STA-008-01 조치 실적 통계 조회 / UC-STA-002-01 위험요소 발생 통계 조회
const UNITS = ['일', '주', '월']
const DEFAULT_ACTION = { from: '2026-11-01', to: '2026-11-30', unit: '일', sido: '시/도 선택', dong: '읍면동 전체' }
const DEFAULT_OCC = { from: '2026-11-01', to: '2026-11-30', unit: '일', hazard: '전체', grade: '전체' }

export default function Stats() {
  // 조회 조건(draft)과 조회 버튼으로 확정된 조건(applied)을 분리 — "조회: 선택 조건으로 차트 갱신"
  const [actDraft, setActDraft] = useState(DEFAULT_ACTION)
  const [actApplied, setActApplied] = useState(DEFAULT_ACTION)
  const [occDraft, setOccDraft] = useState(DEFAULT_OCC)
  const [occApplied, setOccApplied] = useState(DEFAULT_OCC)
  const [loading, setLoading] = useState({ act: false, occ: false })

  const act = useMemo(() => actionStats(actApplied), [actApplied])
  const occ = useMemo(() => occurrenceStats(occApplied), [occApplied])

  const run = (key, apply) => {
    setLoading((l) => ({ ...l, [key]: true }))
    setTimeout(() => {
      apply()
      setLoading((l) => ({ ...l, [key]: false }))
    }, 350)
  }

  return (
    <div className="page-scroll">
      <div className="stats">
        {/* ① 조회 조건 (조치 실적) */}
        <section className="card filter">
          <span className="code">STA-008</span>
          <div className="filter__row">
            <Field label="분석 기간">
              <DateRange from={actDraft.from} to={actDraft.to} onChange={(from, to) => setActDraft((d) => ({ ...d, from, to }))} />
            </Field>
            <Field label="집계 단위"><Pills value={actDraft.unit} onChange={(unit) => setActDraft((d) => ({ ...d, unit }))} /></Field>
            <Field label="지역별">
              <div className="filter__pair">
                <Dropdown value={actDraft.sido} options={SIDO} onChange={(sido) => setActDraft((d) => ({ ...d, sido, dong: '읍면동 전체' }))} width={170} />
                <Dropdown value={actDraft.dong} options={DONG[actDraft.sido]} onChange={(dong) => setActDraft((d) => ({ ...d, dong }))} width={170} />
              </div>
            </Field>
          </div>
          <button className="btn-primary filter__go" disabled={loading.act} onClick={() => run('act', () => setActApplied(actDraft))}>
            {loading.act ? '조회 중' : '조회'}
          </button>
        </section>

        <div className={`grid-2${loading.act ? ' is-loading' : ''}`}>
          <BarCard title="위험요소 조치 실적" sub={`${actApplied.sido === '시/도 선택' ? '행정시·읍면동별' : actApplied.sido} · ${actApplied.unit} 단위 합계`} color="72,128,255" data={act.regionBars} />
          <BarCard title="노선별 제설 조치 실적" sub={`제설 우선노선 · ${actApplied.unit} 단위 합계`} color="0,182,155" data={act.routeBars} />
        </div>

        {/* ④ 조회 조건 (발생 통계) */}
        <section className="card filter">
          <span className="code">STA-002</span>
          <div className="filter__row">
            <Field label="분석 기간">
              <DateRange from={occDraft.from} to={occDraft.to} onChange={(from, to) => setOccDraft((d) => ({ ...d, from, to }))} />
            </Field>
            <Field label="집계 단위"><Pills value={occDraft.unit} onChange={(unit) => setOccDraft((d) => ({ ...d, unit }))} /></Field>
            <Field label="위험 유형"><Dropdown value={occDraft.hazard} options={HAZARD_TYPES} onChange={(hazard) => setOccDraft((d) => ({ ...d, hazard }))} width={170} /></Field>
            <Field label="위험 등급"><Dropdown value={occDraft.grade} options={GRADES} onChange={(grade) => setOccDraft((d) => ({ ...d, grade }))} width={170} /></Field>
          </div>
          <button className="btn-primary filter__go" disabled={loading.occ} onClick={() => run('occ', () => setOccApplied(occDraft))}>
            {loading.occ ? '조회 중' : '조회'}
          </button>
        </section>

        <div className={loading.occ ? 'is-loading' : ''}>
          <TrendCard occ={occ} />
        </div>

        <div className={`grid-2${loading.occ ? ' is-loading' : ''}`}>
          <HourlyCard hourly={occ.hourly} />
          <GradeCard occ={occ} />
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="field">
      <small>{label}</small>
      {children}
    </div>
  )
}

function Pills({ value, onChange }) {
  return (
    <div className="pills" role="radiogroup">
      {UNITS.map((u) => (
        <button key={u} role="radio" aria-checked={value === u} className={`pill${value === u ? ' on' : ''}`} onClick={() => onChange(u)}>{u}</button>
      ))}
    </div>
  )
}

// 분석 기간 — 선택 시 기간 캘린더 호출
function DateRange({ from, to, onChange }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState(from)
  const [t, setT] = useState(to)
  const [err, setErr] = useState('')
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  const apply = () => {
    if (!f || !t) return setErr('시작일과 종료일을 모두 선택하세요.')
    if (f > t) return setErr('시작일이 종료일보다 늦습니다.')
    if ((new Date(t) - new Date(f)) / 86400000 > 366) return setErr('분석 기간은 최대 1년입니다.')
    onChange(f, t)
    setOpen(false)
  }
  const preset = (n) => {
    const end = new Date(t || to)
    const start = new Date(end)
    start.setDate(start.getDate() - n + 1)
    setF(start.toISOString().slice(0, 10))
    setErr('')
  }
  return (
    <div className="daterange" ref={ref}>
      <button type="button" className="dropdown" style={{ width: 260 }} onClick={() => { setF(from); setT(to); setErr(''); setOpen((o) => !o) }}>
        <span>{fmtRange(from, to)}</span>
        <img src={A.icCalendar} alt="" />
      </button>
      {open && (
        <div className="daterange__pop" role="dialog" aria-label="분석 기간 선택">
          <div className="daterange__inputs">
            <input type="date" value={f} max={t} onChange={(e) => { setF(e.target.value); setErr('') }} aria-label="시작일" />
            <span>~</span>
            <input type="date" value={t} min={f} onChange={(e) => { setT(e.target.value); setErr('') }} aria-label="종료일" />
          </div>
          <div className="daterange__presets">
            {[7, 30, 90].map((n) => (
              <button key={n} type="button" onClick={() => preset(n)}>최근 {n}일</button>
            ))}
          </div>
          {err && <p className="daterange__err">{err}</p>}
          <div className="daterange__actions">
            <button type="button" onClick={() => setOpen(false)}>취소</button>
            <button type="button" className="btn-primary" onClick={apply}>적용</button>
          </div>
        </div>
      )}
    </div>
  )
}

function BarCard({ title, sub, color, data }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <section className="card bars">
      <h3>{title}</h3>
      <span className="code">MCS-015</span>
      <p className="bars__sub">{sub}</p>
      <div className="bars__base" />
      {data.map((d, i) => (
        <div key={d.name} className="bars__item" style={{ left: 45 + i * 66 }} title={`${d.name} · ${d.value.toLocaleString()}건`}>
          <em>{d.value}</em>
          <i style={{ height: (d.value / max) * 58, background: d.strong ? `rgb(${color})` : `rgba(${color},0.32)` }} />
          <small>{d.name}</small>
        </div>
      ))}
    </section>
  )
}

// ⑤ 위험요소(적설·결빙) 발생 추이 — 위험/주의/양호 등급별 라인
function TrendCard({ occ }) {
  const W = 1072
  const H = 138
  const shown = occ.grade === '전체' ? ['위험', '주의', '양호'] : [occ.grade]
  const maxVal = Math.max(...shown.flatMap((g) => occ.series[g]), 1)
  const top = Math.ceil(maxVal / 15) * 15
  const n = occ.labels.length
  const x = (i) => (n === 1 ? W / 2 : (i / (n - 1)) * W)
  const y = (v) => H - (v / top) * H
  const ticks = [3, 2, 1, 0].map((k) => (top / 3) * k)
  const step = Math.max(1, Math.ceil(n / 7))
  const [hover, setHover] = useState(null)
  return (
    <section className="card trend">
      <div className="trend__head">
        <h3>위험요소(적설·결빙) 발생 추이 {occ.hazard !== '전체' && <small className="trend__tag">{occ.hazard}</small>}</h3>
        <div className="legend-inline">
          {['위험', '주의', '양호'].map((g) => (
            <span key={g} style={{ opacity: shown.includes(g) ? 1 : 0.3 }}><i style={{ background: GRADE_COLORS[g] }} />{g}</span>
          ))}
        </div>
      </div>
      <div className="trend__chart" onMouseLeave={() => setHover(null)}>
        {ticks.map((t, i) => (
          <div key={i} className="hgrid" style={{ top: 16 + (i * H) / 3, left: 34, width: W }}>
            <small>{Math.round(t)}</small>
          </div>
        ))}
        <svg className="trend__svg" width={W} height={H} style={{ left: 34, top: 16 }} onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setHover(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / W) * (n - 1)))))
        }}>
          {shown.map((g) => (
            <polyline key={g} fill="none" stroke={GRADE_COLORS[g]} strokeWidth="2" strokeLinejoin="round" points={occ.series[g].map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
          ))}
          {hover != null && <line x1={x(hover)} x2={x(hover)} y1="0" y2={H} stroke="#d0d5dd" strokeDasharray="3 3" />}
          {hover != null && shown.map((g) => <circle key={g} cx={x(hover)} cy={y(occ.series[g][hover])} r="3.5" fill="#fff" stroke={GRADE_COLORS[g]} strokeWidth="2" />)}
        </svg>
        {occ.labels.map((l, i) => (i % step === 0 || i === n - 1 ? <small key={i} className="xlab" style={{ left: 34 + x(i), top: 168 }}>{l}</small> : null))}
        {hover != null && (
          <div className="chart-tip" style={{ left: Math.min(34 + x(hover) + 10, W - 100), top: 10 }}>
            <b>{occ.labels[hover]}</b>
            {shown.map((g) => <span key={g}><i style={{ background: GRADE_COLORS[g] }} />{g} {Math.round(occ.series[g][hover])}건</span>)}
          </div>
        )}
      </div>
    </section>
  )
}

// ⑥ 시간대별 발생 분포 — 최다 발생 시간대 강조
function HourlyCard({ hourly }) {
  const max = Math.max(...hourly, 1)
  const top = Math.ceil(max / 12) * 12
  const peak = [...hourly.keys()].sort((a, b) => hourly[b] - hourly[a]).slice(0, 3).sort((a, b) => a - b)
  const range = `${String(peak[0]).padStart(2, '0')}~${String(peak[peak.length - 1]).padStart(2, '0')}시`
  return (
    <section className="card hourly">
      <h3>시간대별 발생 분포</h3>
      <p className="sub">0~23시 결빙 발생 건수 · 최다 발생 {range}</p>
      <span className="code">STA-002</span>
      {[3, 2, 1, 0].map((k, i) => (
        <div key={k} className="hgrid" style={{ top: 87 + i * 49.33, left: 43, width: 522 }}>
          <small>{Math.round((top / 3) * k)}</small>
        </div>
      ))}
      {hourly.map((n, h) => {
        const height = (n / top) * 148
        return (
          <i key={h} className="hbar" title={`${h}시 · ${n}건`} style={{ left: 43 + h * 22.087, top: 235 - height, height, background: peak.includes(h) ? '#4880ff' : 'rgba(72,128,255,0.32)' }} />
        )
      })}
      {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
        <small key={h} className="xlab" style={{ left: 50 + h * 22.087, top: 241 }}>{h}시</small>
      ))}
      <p className="note">※ {range} 시간대 집중 발생 패턴</p>
    </section>
  )
}

// ⑦ 유형·등급별 발생 분포 — 유형별 위험·주의·양호 누적 막대와 합계
function GradeCard({ occ }) {
  const totals = occ.grades.map((g) => g.위험 + g.주의 + g.양호)
  const px = 400 / Math.max(...totals, 1)
  return (
    <section className="card grades">
      <h3>유형·등급별 발생 분포</h3>
      <p className="sub">위험요소 유형 × 위험등급 누적 건수</p>
      <span className="code">STA-002</span>
      <div className="legend-inline legend-inline--abs">
        {['위험', '주의', '양호'].map((g) => (
          <span key={g} style={{ opacity: occ.grade === '전체' || occ.grade === g ? 1 : 0.3 }}><i style={{ background: GRADE_COLORS[g] }} />{g}</span>
        ))}
      </div>
      {occ.grades.map((row, i) => {
        const dim = occ.hazard !== '전체' && occ.hazard !== row.type
        return (
          <div key={row.type} className="grade-row" style={{ top: 93 + i * 34, opacity: dim ? 0.3 : 1 }}>
            <span className="grade-row__label">{row.type}</span>
            <span className="grade-row__bar">
              {['위험', '주의', '양호'].map((g) => (
                <i key={g} style={{ width: row[g] * px, background: GRADE_COLORS[g], opacity: occ.grade === '전체' || occ.grade === g ? 1 : 0.18 }} title={`${row.type} · ${g} ${row[g]}건`} />
              ))}
            </span>
            <b>{occ.grade === '전체' ? totals[i] : row[occ.grade]}</b>
          </div>
        )
      })}
      <p className="note">※ 유형·등급 축은 시계열 차트와 동일 기간 조건으로 연동됩니다</p>
    </section>
  )
}
