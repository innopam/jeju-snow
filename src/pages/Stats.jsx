import { useEffect, useMemo, useRef, useState } from 'react'
import { BP, useMedia } from '../useMedia.js'
import { A } from '../assets.js'
import { Dropdown } from '../components/Controls.jsx'
import { DEFAULT_FILTER, GRADES, GRADE_COLORS, GRADE_OPTIONS, HAZARD_TYPES, SIDO, dongOptions, fmtRange, routeTable, statsData } from '../data/stats.js'
import './stats.css'

// UI-002 통계 — STA-001 핵심 지표 / STA-002 위험요소 발생 통계 / STA-008 조치·제설 실적
const UNITS = ['일', '주', '월']

export default function Stats() {
  // 조회 조건(draft)과 조회 버튼으로 확정된 조건(applied)을 분리 — 하나의 조회 조건으로 화면 전체 갱신
  const [draft, setDraft] = useState(DEFAULT_FILTER)
  const [applied, setApplied] = useState(DEFAULT_FILTER)
  const [loading, setLoading] = useState(false)
  const data = useMemo(() => statsData(applied), [applied])
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))

  const run = (next) => {
    setLoading(true)
    setTimeout(() => {
      setApplied(next)
      setLoading(false)
    }, 350)
  }

  return (
    <div className="page-scroll">
      <div className="stats">
        {/* 조회 조건 */}
        <section className="card filter">
          <div className="filter__row">
            <Field label="분석 기간">
              <DateRange from={draft.from} to={draft.to} onChange={(from, to) => set({ from, to })} />
            </Field>
            <Field label="집계 단위"><Pills value={draft.unit} onChange={(unit) => set({ unit })} /></Field>
            <Field label="행정시"><Dropdown value={draft.sido} options={SIDO} onChange={(sido) => set({ sido, dong: '읍면동 전체' })} width={150} height={40} /></Field>
            <Field label="읍면동"><Dropdown value={draft.dong} options={dongOptions(draft.sido)} onChange={(dong) => set({ dong })} width={150} height={40} /></Field>
            <Field label="위험 유형"><Dropdown value={draft.hazard} options={HAZARD_TYPES} onChange={(hazard) => set({ hazard })} width={150} height={40} /></Field>
            <Field label="위험 등급"><Dropdown value={draft.grade} options={GRADE_OPTIONS} onChange={(grade) => set({ grade })} width={150} height={40} /></Field>
          </div>
          <div className="filter__actions">
            <button className="btn-gray" disabled={loading} onClick={() => { setDraft(DEFAULT_FILTER); run(DEFAULT_FILTER) }}>초기화</button>
            <button className="btn-primary" disabled={loading} onClick={() => run(draft)}>{loading ? '조회 중' : '조회'}</button>
          </div>
        </section>

        <div className={`stats__body${loading ? ' is-loading' : ''}`}>
          <section className="stats__sec">
            <h2 className="stats__title">핵심 지표</h2>
            <KpiRow kpi={data.kpi} />
          </section>

          <section className="stats__sec">
            <h2 className="stats__title">위험요소 발생 통계</h2>
            <div className="stats__row stats__row--occ">
              <TrendCard data={data} unit={applied.unit} />
              <TypeGradeCard data={data} />
            </div>
          </section>

          <section className="stats__sec">
            <h2 className="stats__title">조치·제설 실적</h2>
            <div className="stats__row stats__row--act">
              <ActionCard labels={data.labels} action={data.action} unit={applied.unit} />
              <DongRouteCards key={JSON.stringify(applied)} table={data.dongTable} applied={applied} />
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, unit, sub, bar }) {
  return (
    <div className="kpi">
      <div className="kpi__top">
        <span className="kpi__label">{label}</span>
        <div className="kpi__value"><b>{value}</b><small>{unit}</small></div>
        {bar && (
          <div className="kpi__bar">
            {bar.map(([w, c], i) => <i key={i} style={{ flex: w, background: c }} />)}
          </div>
        )}
      </div>
      <p className="kpi__sub">{sub}</p>
    </div>
  )
}

// STA-001 핵심 지표
function KpiRow({ kpi }) {
  const recv = ({ ok, warn, miss }) => {
    const tot = ok + warn + miss
    return { rate: (((ok + warn) / tot) * 100).toFixed(1), bar: [[ok, '#168e79'], [warn, '#fcbe2d'], [miss, '#c9cdd3']].filter(([w]) => w), tot }
  }
  const sensor = recv(kpi.sensor)
  const vehicle = recv(kpi.vehicle)
  const up = Number(kpi.prevDelta) >= 0
  const rate = Number(kpi.rate)
  return (
    <div className="kpi-row">
      <Kpi label="위험요소 발생" value={kpi.occurred.toLocaleString()} unit="건" sub={<>이전 기간 대비 <span className={up ? 'up' : 'down'}>{up ? '▲' : '▼'} {Math.abs(kpi.prevDelta)}%</span></>} />
      <Kpi label="조치 완료율" value={kpi.rate} unit="%" bar={[[rate, '#168e79'], [100 - rate, '#f2f4f7']]} sub={`완료 ${kpi.done.toLocaleString()} / ${kpi.occurred.toLocaleString()}건`} />
      <Kpi label="평균 조치 소요시간" value={`${kpi.avg.h}시간 ${kpi.avg.m}`} unit="분" sub="발생 → 조치 완료 기준" />
      <Kpi label="미조치 · 장기 미조치" value={kpi.unresolved} unit="건" sub={`장기 미조치(2시간↑) ${kpi.longUnresolved}건 · 조치중 ${kpi.inProgress}건`} />
      <Kpi label="제설 작업 실적" value={kpi.works.toLocaleString()} unit="회" sub={`작업 연장 ${kpi.length.toLocaleString()}km · 구간 완료율 ${kpi.segRate}%`} />
      <Kpi label={`노면 센서 수신율 · ${sensor.tot}대`} value={sensor.rate} unit="%" bar={sensor.bar} sub={`정상 ${kpi.sensor.ok} · 이상 ${kpi.sensor.warn} · 미수신 ${kpi.sensor.miss}`} />
      <Kpi label={`제설차량 단말 수신율 · ${vehicle.tot}대`} value={vehicle.rate} unit="%" bar={vehicle.bar} sub={`정상 ${kpi.vehicle.ok} · 이상 ${kpi.vehicle.warn} · 미수신 ${kpi.vehicle.miss}`} />
    </div>
  )
}

function Legend({ items, square }) {
  return (
    <div className={`legend-inline${square ? ' legend-inline--sq' : ''}`}>
      {items.map(([name, color, dim]) => <span key={name} style={{ opacity: dim ? 0.3 : 1 }}><i style={{ background: color }} />{name}</span>)}
    </div>
  )
}

const niceTop = (max, step) => Math.max(step, Math.ceil(max / step) * step)

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
      <button type="button" className="dropdown" style={{ width: 290, height: 40 }} onClick={() => { setF(from); setT(to); setErr(''); setOpen((o) => !o) }}>
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

// 위험요소 발생 추이 — 심각·경계·주의 라인 (가로 폭에 맞춰 늘어남)
function TrendCard({ data, unit }) {
  const VW = 1000
  const H = 200
  const { labels, series, shown } = data
  const maxVal = Math.max(...shown.flatMap((g) => series[g]), 1)
  const top = niceTop(maxVal, unit === '일' ? 20 : 100)
  const n = labels.length
  const xp = (i) => (n === 1 ? 50 : (i / (n - 1)) * 100) // %
  const y = (v) => H - (v / top) * H
  const ticks = [4, 3, 2, 1, 0].map((k) => (top / 4) * k)
  const [hover, setHover] = useState(null)
  const plotRef = useRef(null)
  const narrow = useMedia(BP.mobile)
  const step = Math.max(1, Math.ceil(n / (narrow ? 5 : 10)))
  return (
    <section className="card chart-card">
      <div className="chart-card__head">
        <div>
          <h3>위험요소 발생 추이 {data.hazard !== '전체' && <small className="trend__tag">{data.hazard}</small>}</h3>
          <p className="card__sub">{unit} 단위 · AI 위험등급별 발생 건수</p>
        </div>
        <Legend items={GRADES.map((g) => [g, GRADE_COLORS[g], !shown.includes(g)])} />
      </div>
      <div className="trend__chart">
        <div className="trend__y">
          {ticks.map((t, i) => <small key={i} style={{ top: (i * H) / 4 }}>{Math.round(t)}</small>)}
        </div>
        <div
          className="trend__plot"
          ref={plotRef}
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const r = plotRef.current.getBoundingClientRect()
            setHover(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / r.width) * (n - 1)))))
          }}
        >
          {ticks.map((_, i) => <i key={i} className={`trend__grid${i === 4 ? ' base' : ''}`} style={{ top: (i * H) / 4 }} />)}
          <svg className="trend__svg" viewBox={`0 0 ${VW} ${H}`} preserveAspectRatio="none">
            {shown.map((g) => (
              <polyline key={g} fill="none" stroke={GRADE_COLORS[g]} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" points={series[g].map((v, i) => `${(xp(i) / 100) * VW},${y(v)}`).join(' ')} />
            ))}
            {hover != null && <line x1={(xp(hover) / 100) * VW} x2={(xp(hover) / 100) * VW} y1="0" y2={H} stroke="#d0d5dd" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
          </svg>
          {hover != null && shown.map((g) => <span key={g} className="trend__dot" style={{ left: `${xp(hover)}%`, top: y(series[g][hover]), borderColor: GRADE_COLORS[g] }} />)}
          {labels.map((l, i) => (i % step === 0 ? <small key={i} className="xlab" style={{ left: `${xp(i)}%`, top: H + 6 }}>{l}</small> : null))}
          {hover != null && (
            <div className={`chart-tip${xp(hover) > 70 ? ' left' : ''}`} style={{ left: `${xp(hover)}%`, top: 0 }}>
              <b>{labels[hover]}</b>
              {shown.map((g) => <span key={g}><i style={{ background: GRADE_COLORS[g] }} />{g} {Math.round(series[g][hover])}건</span>)}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// 유형·등급별 발생 — 기간 누적, 관심 등급 제외 (가로 누적 막대)
function TypeGradeCard({ data }) {
  const { types, shown, hazard } = data
  const totals = types.map((t) => shown.reduce((s, g) => s + t[g], 0))
  const top = niceTop(Math.max(...totals, 1) * 1.15, 100)
  const tick = top > 600 ? 200 : 100
  const ticks = Array.from({ length: Math.floor(top / tick) + 1 }, (_, i) => i * tick)
  return (
    <section className="card chart-card">
      <div className="chart-card__head">
        <div>
          <h3>유형·등급별 발생</h3>
          <p className="card__sub">기간 누적 · 관심 등급 제외</p>
        </div>
        <Legend square items={GRADES.map((g) => [g, GRADE_COLORS[g], !shown.includes(g)])} />
      </div>
      <div className="hbar">
        <div className="hbar__labels">
          {types.map((t) => <span key={t.type} style={{ opacity: hazard !== '전체' && hazard !== t.type ? 0.3 : 1 }}>{t.type}</span>)}
        </div>
        <div className="hbar__plot">
          {ticks.map((t, i) => (
            <i key={t} className={`hbar__grid${i === 0 ? ' base' : ''}`} style={{ left: `calc((100% - 36px) * ${t / top})` }}><small>{t}</small></i>
          ))}
          {types.map((t, i) => (
            <div key={t.type} className="hbar__row" style={{ opacity: hazard !== '전체' && hazard !== t.type ? 0.3 : 1 }}>
              <span className="hbar__bar" style={{ width: `${(totals[i] / top) * 100}%` }}>
                {shown.map((g) => <i key={g} style={{ flex: t[g], background: GRADE_COLORS[g] }} title={`${t.type} · ${g} ${t[g]}건`} />)}
              </span>
              <b>{totals[i]}</b>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// 일별 조치 실적 — 조치 완료 / 미완료 누적 막대
function ActionCard({ labels, action, unit }) {
  const top = niceTop(Math.max(...action.map((a) => a.done + a.undone), 1), unit === '일' ? 30 : 300)
  const n = labels.length
  const step = Math.max(1, Math.ceil(n / 8))
  return (
    <section className="card chart-card">
      <div className="chart-card__head">
        <h3>{unit}별 조치 실적</h3>
        <Legend square items={[['조치 완료', '#168e79'], ['미완료', '#c9cdd3']]} />
      </div>
      <div className="vbar">
        <div className="vbar__y">
          {[3, 2, 1, 0].map((k) => <small key={k}>{Math.round((top / 3) * k)}</small>)}
        </div>
        <div className="vbar__plot">
          {[0, 1, 2, 3].map((i) => <i key={i} className={`vbar__grid${i === 3 ? ' base' : ''}`} style={{ top: `${(i / 3) * 100}%` }} />)}
          {action.map((a, i) => (
            <div key={i} className="vbar__col" title={`${labels[i]} · 조치 완료 ${a.done}건 · 미완료 ${a.undone}건`}>
              <span style={{ height: `${((a.done + a.undone) / top) * 100}%` }}>
                {a.undone > 0 && <i style={{ flex: a.undone, background: '#c9cdd3' }} />}
                <i style={{ flex: a.done, background: '#168e79' }} />
              </span>
              {i % step === 0 && <small>{labels[i]}</small>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// 읍면동별 제설 현황 — 행을 선택하면 오른쪽 노선별 제설 현황이 해당 지역으로 바뀐다
function DongRouteCards({ table, applied }) {
  const [picked, setPicked] = useState(() => (applied.dong !== '읍면동 전체' ? applied.dong : table[0].rows.find((r) => r.name === '아라동')?.name ?? table[0].rows[0].name))
  const routes = useMemo(() => routeTable(picked, applied), [picked, applied])
  return (
    <>
      <section className="card chart-card">
        <div className="chart-card__head"><h3>읍면동별 제설 현황</h3></div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr><th>읍면동</th><th>위험 발생</th><th>제설 작업</th><th>완료율</th></tr>
            </thead>
            <tbody>
              {table.map((c) => <DongGroup key={c.city} c={c} picked={picked} onPick={setPicked} />)}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card chart-card">
        <div className="chart-card__head"><h3>노선별 제설 현황 <span className="accent">· {picked}</span></h3></div>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr><th>노선</th><th>제설 작업</th><th>작업 연장</th><th>완료율</th></tr>
            </thead>
            <tbody>
              {routes.rows.map((r) => (
                <tr key={r.name}><td>{r.name}</td><td>{r.work}회</td><td>{r.km}km</td><td>{r.rate}%</td></tr>
              ))}
              <tr className="tbl__sum"><td>합계</td><td>{routes.total.work}회</td><td>{routes.total.km}km</td><td>{routes.total.rate}%</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

function DongGroup({ c, picked, onPick }) {
  return (
    <>
      <tr className={`tbl__group${picked === c.city ? ' sel' : ''}`} onClick={() => onPick(c.city)}>
        <td>{c.city}</td><td>{c.occ}건</td><td>{c.work}회</td><td>{c.rate}%</td>
      </tr>
      {c.rows.map((r) => (
        <tr key={r.name} className={`tbl__sub${picked === r.name ? ' sel' : ''}`} onClick={() => onPick(r.name)}>
          <td>{r.name}</td><td>{r.occ}건</td><td>{r.work}회</td><td>{r.rate}%</td>
        </tr>
      ))}
    </>
  )
}
