import { useState } from 'react'
import { A } from '../../assets'
import { Dropdown, EmptyState, SearchField } from '../../components/Controls'
import { HAZARD_GRADE_STYLE, HAZARD_GRADES, HAZARD_LIST } from '../../data/dashboard'
import type { HazardRow } from '../../data/dashboard'
import { HAZARD_COLORS } from '../../data/geo'

const GRADE_OPTIONS = ['등급 전체', ...HAZARD_GRADES]
const TYPE_OPTIONS = ['위험요소 전체', '결빙', '적설']
const JUR_OPTIONS = ['관할 전체', '도청', '제주시', '서귀포시']
// 위험요소 글자색 (적설은 띠 색보다 진하게)
const TYPE_TEXT: Record<string, string> = { ...HAZARD_COLORS, 적설: '#0284c7' }
const countBy = (rows: HazardRow[]) => HAZARD_GRADES.map((g) => rows.filter((r) => r.grade === g).length)

// 위험구간 목록 (GIS-003) — 등급·관할·검색으로 거르고, 읍면동 묶음별로 접고 편다
export default function HazardList({ onShowPlace }: { onShowPlace: (dong: string) => void }) {
  const [grade, setGrade] = useState('등급 전체')
  const [type, setType] = useState('위험요소 전체')
  const [jur, setJur] = useState('관할 전체')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(() => new Set([HAZARD_LIST[0].name]))
  const [selected, setSelected] = useState<string | null>(null)

  const q = query.trim()
  const inJur = HAZARD_LIST.map((g) => ({ ...g, rows: g.rows.filter((r) => jur === '관할 전체' || r.jur === jur) })).filter((g) => g.rows.length > 0)
  const total = inJur.reduce((s, g) => s + g.rows.length, 0)
  const groups = inJur
    .map((g) => ({
      ...g,
      rows: g.rows.filter(
        (r) =>
          (grade === '등급 전체' || r.grade === grade) &&
          (type === '위험요소 전체' || r.type === type) &&
          (!q || r.road.includes(q) || r.dong.includes(q) || g.name.includes(q)),
      ),
    }))
    .filter((g) => g.rows.length > 0)
  const shown = groups.reduce((s, g) => s + g.rows.length, 0)
  const allOpen = groups.length > 0 && groups.every((g) => open.has(g.name))

  const toggle = (name: string) =>
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
      <div className="hz-tools">
        <Dropdown value={grade} options={GRADE_OPTIONS} onChange={setGrade} size="sm" />
        <Dropdown value={type} options={TYPE_OPTIONS} onChange={setType} size="sm" />
        <Dropdown value={jur} options={JUR_OPTIONS} onChange={setJur} size="sm" />
      </div>
      <SearchField size="sm" value={query} onChange={setQuery} placeholder="도로명·읍면동 검색" />
      <div className="hz-table">
        <div className="hz-row hz-row--th">
          <span>구간</span><span>위험요소</span><span>노면온도</span><span>제설제</span><span>기상</span><span>등급</span>
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
                      <i style={{ background: HAZARD_GRADE_STYLE[gr].text }} />
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
                          <span>
                            <i><i style={{ height: st.bar, background: HAZARD_COLORS[r.type], opacity: 0.9 }} /></i>
                            <b>{r.road}</b>
                          </span>
                          <small>{r.dong}</small>
                        </span>
                        <span className="hz-type" style={{ color: TYPE_TEXT[r.type] }}>{r.type}</span>
                        <b className="hz-temp">{r.surface.toFixed(1)}℃</b>
                        <b className={r.salt < 20 ? 'hz-low' : ''}>{r.salt}%</b>
                        <span>{r.air.toFixed(1)}℃ {r.sky}</span>
                        <span><em className={`grade grade--${st.tone}`}><i />{r.grade}</em></span>
                      </button>
                    )
                  })}
              </div>
            )
          })}
          {groups.length === 0 && <EmptyState message="조건에 맞는 위험구간이 없습니다." />}
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
