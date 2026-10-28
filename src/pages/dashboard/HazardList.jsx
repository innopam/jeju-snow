import { useState } from 'react'
import { A } from '../../assets.js'
import { Dropdown } from '../../components/Controls.jsx'
import { HAZARD_GRADE_STYLE, HAZARD_GRADES, HAZARD_LIST } from '../../data/dashboard.js'
import { HAZARD_COLORS } from '../../data/geo.js'

const JUR_OPTIONS = ['관할 전체', '제주시', '서귀포시']
const countBy = (rows) => HAZARD_GRADES.map((g) => rows.filter((r) => r.grade === g).length)

// 위험구간 목록 (GIS-003) — 등급·관할·검색으로 거르고, 읍면동 묶음별로 접고 편다
export default function HazardList({ onShowPlace }) {
  const [grade, setGrade] = useState('전체')
  const [jur, setJur] = useState('관할 전체')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(() => new Set([HAZARD_LIST[0].name]))
  const [selected, setSelected] = useState(null)

  const q = query.trim()
  const inJur = HAZARD_LIST.filter((g) => jur === '관할 전체' || g.jur === jur)
    .map((g) => ({ ...g, rows: g.rows.filter((r) => !q || r.road.includes(q) || r.dong.includes(q) || g.name.includes(q)) }))
  const gradeCounts = countBy(inJur.flatMap((g) => g.rows))
  const total = gradeCounts.reduce((s, n) => s + n, 0)
  const groups = inJur
    .map((g) => ({ ...g, rows: g.rows.filter((r) => grade === '전체' || r.grade === grade) }))
    .filter((g) => g.rows.length > 0)
  const shown = groups.reduce((s, g) => s + g.rows.length, 0)
  const allOpen = groups.length > 0 && groups.every((g) => open.has(g.name))

  const toggle = (name) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (!next.delete(name)) next.add(name)
      return next
    })

  return (
    <div className="dp__sec hz">
      <div className="dp__head">
        <p className="section-title">위험구간 목록</p>
        <small>총 <b>{total}</b> 구간 · 기상청 실황</small>
      </div>
      <div className="hz-chips">
        <button className={grade === '전체' ? 'on' : ''} onClick={() => setGrade('전체')}>
          <b>전체</b><span>{total}</span>
        </button>
        {HAZARD_GRADES.map((g, i) => (
          <button key={g} className={grade === g ? 'on' : ''} onClick={() => setGrade(grade === g ? '전체' : g)}>
            <img src={HAZARD_GRADE_STYLE[g].dot} alt="" />
            <span>{g}</span>
            <b style={{ color: HAZARD_GRADE_STYLE[g].text }}>{gradeCounts[i]}</b>
          </button>
        ))}
      </div>
      <div className="hz-tools">
        <label className="hz-search">
          <img src={A.icSearch14} alt="" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="도로명·읍면동 검색" />
        </label>
        <Dropdown value={jur} options={JUR_OPTIONS} onChange={setJur} className="dropdown--sm" icon={A.icChevronDown12} />
      </div>
      <div className="hz-table">
        <div className="hz-row hz-row--th">
          <span>구간</span><span>노면온도</span><span>제설제</span><span>기상</span><span>등급</span>
        </div>
        <div className="hz-body">
          {groups.map((g) => {
            const expanded = open.has(g.name) || Boolean(q)
            const counts = countBy(g.rows)
            return (
              <div key={g.name}>
                <button className="hz-group" aria-expanded={expanded} onClick={() => toggle(g.name)}>
                  <img src={expanded ? A.icChevronDown14 : A.icChevronRight14} alt="" />
                  <b>{g.name}</b>
                  <small>{g.rows.length}구간</small>
                  {HAZARD_GRADES.map((gr, i) => (
                    <span key={gr} className="hz-count">
                      <img src={HAZARD_GRADE_STYLE[gr].dot} alt="" />
                      <b style={{ color: HAZARD_GRADE_STYLE[gr].text }}>{counts[i]}</b>
                    </span>
                  ))}
                </button>
                {expanded &&
                  g.rows.map((r) => {
                    const st = HAZARD_GRADE_STYLE[r.grade]
                    return (
                      <button
                        key={r.id}
                        className={`hz-row${selected === r.id ? ' sel' : ''}`}
                        title={`${r.road} · ${r.dong} — 지도에서 보기`}
                        onClick={() => {
                          setSelected(r.id)
                          onShowPlace(r.dong)
                        }}
                      >
                        <span className="hz-seg">
                          <i><i style={{ height: st.bar, background: HAZARD_COLORS[r.type], opacity: 0.9 }} /></i>
                          <b>{r.road}</b>
                          <small>{r.dong}</small>
                        </span>
                        <b className="hz-temp">{r.surface.toFixed(1)}℃</b>
                        <b className={r.salt < 20 ? 'hz-low' : ''}>{r.salt}%</b>
                        <span>{r.air.toFixed(1)}℃ {r.sky}</span>
                        <span><em style={{ color: st.text, background: st.bg }}>{r.grade}</em></span>
                      </button>
                    )
                  })}
              </div>
            )
          })}
          {groups.length === 0 && <p className="hz-empty">조건에 맞는 위험구간이 없습니다.</p>}
        </div>
        <div className="hz-foot">
          <span>{groups.length}개 읍면동 · {shown}구간</span>
          {!q && groups.length > 0 && (
            <button onClick={() => setOpen(allOpen ? new Set() : new Set(groups.map((g) => g.name)))}>{allOpen ? '모두 접기' : '모두 펼치기'}</button>
          )}
        </div>
      </div>
    </div>
  )
}
