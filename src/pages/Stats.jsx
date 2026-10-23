import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { A } from '../assets.js'
import { Dropdown } from '../components/Controls.jsx'
import './stats.css'

const PERIODS = ['2026.11.01 ~ 11.30', '2026.10.01 ~ 10.31', '2026.12.01 ~ 12.31']
const UNITS = ['일', '주', '월']

// 위험요소 조치 실적 (MCS-015) — 막대 높이(px)는 Figma 값
const REGION_ACTIONS = [
  ['제주시 노형', 58, true], ['애월읍', 52, true], ['한림읍', 44], ['조천읍', 40], ['구좌읍', 34], ['서귀포 중문', 48], ['성산읍', 30], ['대정읍', 26],
]
const ROUTE_ACTIONS = [
  ['1100도로', 56, true], ['평화로', 50, true], ['516도로', 46], ['비자림로', 38], ['한라산로', 32], ['남조로', 28], ['일주도로', 44], ['번영로', 36],
]
// 시간대별 발생 분포 (0~23시, 건수)
const HOURLY = [12, 9, 7, 6, 8, 14, 26, 34, 31, 22, 16, 12, 10, 11, 13, 15, 19, 23, 20, 16, 14, 13, 15, 13]
// 유형·등급별 누적 (위험/주의/양호)
const GRADES = [
  ['결빙', 49.231, 135.385, 215.385],
  ['블랙아이스', 36.923, 90.256, 123.077],
  ['적설', 22.564, 77.949, 172.308],
  ['슬러쉬', 12.308, 45.128, 94.359],
  ['습기', 6.154, 28.718, 106.667],
]

export default function Stats() {
  const { setToast } = useOutletContext()
  const [period1, setPeriod1] = useState(PERIODS[0])
  const [unit1, setUnit1] = useState('일')
  const [sido, setSido] = useState('시/도 선택')
  const [dong, setDong] = useState('읍면동 전체')
  const [period2, setPeriod2] = useState(PERIODS[0])
  const [unit2, setUnit2] = useState('일')
  const [hazard, setHazard] = useState('전체')
  const [grade, setGrade] = useState('전체')

  return (
    <div className="page-scroll">
      <div className="stats">
        <section className="card filter">
          <span className="code">STA-002</span>
          <div className="filter__row">
            <Field label="분석 기간"><Dropdown value={period1} options={PERIODS} onChange={setPeriod1} width={260} /></Field>
            <Field label="집계 단위"><Pills value={unit1} onChange={setUnit1} /></Field>
            <Field label="지역별">
              <div className="filter__pair">
                <Dropdown value={sido} options={['시/도 선택', '제주시', '서귀포시']} onChange={setSido} width={170} />
                <Dropdown value={dong} options={['읍면동 전체', '노형동', '애월읍', '한림읍', '조천읍', '대정읍']} onChange={setDong} width={170} />
              </div>
            </Field>
          </div>
          <button className="btn-primary filter__go" onClick={() => setToast(`${period1} · ${unit1} 단위 조회 완료 (목업 데이터)`)}>조회</button>
        </section>

        <div className="grid-2">
          <BarCard title="위험요소 조치 실적" color="72,128,255" data={REGION_ACTIONS} />
          <BarCard title="노선별 제설 조치 실적" color="0,182,155" data={ROUTE_ACTIONS} />
        </div>

        <section className="card filter">
          <span className="code">STA-002</span>
          <div className="filter__row">
            <Field label="분석 기간"><Dropdown value={period2} options={PERIODS} onChange={setPeriod2} width={260} /></Field>
            <Field label="집계 단위"><Pills value={unit2} onChange={setUnit2} /></Field>
            <Field label="위험 유형"><Dropdown value={hazard} options={['전체', '결빙', '블랙아이스', '적설', '슬러쉬', '습기']} onChange={setHazard} width={170} /></Field>
            <Field label="위험 등급"><Dropdown value={grade} options={['전체', '위험', '주의', '양호']} onChange={setGrade} width={170} /></Field>
          </div>
          <button className="btn-primary filter__go" onClick={() => setToast(`${hazard} · ${grade} 조건으로 조회했습니다 (목업 데이터)`)}>조회</button>
        </section>

        <section className="card trend">
          <div className="trend__head">
            <h3>위험요소(적설·결빙) 발생 추이</h3>
            <div className="legend-inline">
              <span><i style={{ background: '#f93c65' }} />위험</span>
              <span><i style={{ background: '#fcbe2d' }} />주의</span>
              <span><i style={{ background: '#00b69b' }} />양호</span>
            </div>
          </div>
          <div className="trend__chart">
            {[45, 30, 15, 0].map((t, i) => (
              <div key={t} className="hgrid" style={{ top: 6 + i * 52, left: 34, width: 1072 }}>
                <small>{t}</small>
              </div>
            ))}
            {['1일', '5일', '10일', '15일', '20일', '25일', '30일'].map((d, i) => (
              <small key={d} className="xlab" style={{ left: [34, 181.86, 366.69, 551.52, 736.34, 921.17, 1106][i], top: 168 }}>{d}</small>
            ))}
            <img src={A.statsTrend} alt="위험·주의·양호 발생 추이 선 그래프" style={{ position: 'absolute', left: 34, top: 16, width: 1074, height: 138 }} />
          </div>
        </section>

        <div className="grid-2">
          <section className="card hourly">
            <h3>시간대별 발생 분포</h3>
            <p className="sub">0~23시 결빙 발생 건수 · 최다 발생 06~08시</p>
            <span className="code">STA-002</span>
            {[36, 24, 12, 0].map((t, i) => (
              <div key={t} className="hgrid" style={{ top: 87 + i * 49.33, left: 43, width: 522 }}>
                <small>{t}</small>
              </div>
            ))}
            {HOURLY.map((n, h) => {
              const height = (n / 36) * 148
              return (
                <i
                  key={h}
                  className="hbar"
                  title={`${h}시 · ${n}건`}
                  style={{ left: 43 + h * 22.087, top: 235 - height, height, background: h >= 6 && h <= 8 ? '#4880ff' : 'rgba(72,128,255,0.32)' }}
                />
              )
            })}
            {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
              <small key={h} className="xlab" style={{ left: 50 + h * 22.087, top: 241 }}>{h}시</small>
            ))}
            <p className="note">※ 새벽~출근 시간대(06~08시) 집중 발생 패턴</p>
          </section>

          <section className="card grades">
            <h3>유형·등급별 발생 분포</h3>
            <p className="sub">위험요소 유형 × 위험등급 누적 건수</p>
            <span className="code">STA-002</span>
            <div className="legend-inline legend-inline--abs">
              <span><i style={{ background: '#f93c65' }} />위험</span>
              <span><i style={{ background: '#fcbe2d' }} />주의</span>
              <span><i style={{ background: '#00b69b' }} />양호</span>
            </div>
            {GRADES.map(([label, d, w, g], i) => {
              const k = 390 / 400 // 400px = 390건 (Figma 결빙 막대 기준)
              const total = Math.round((d + w + g) * k)
              return (
                <div key={label} className="grade-row" style={{ top: 93 + i * 34 }}>
                  <span className="grade-row__label">{label}</span>
                  <span className="grade-row__bar">
                    <i style={{ width: d, background: '#f93c65' }} title={`위험 ${Math.round(d * k)}건`} />
                    <i style={{ width: w, background: '#fcbe2d' }} title={`주의 ${Math.round(w * k)}건`} />
                    <i style={{ width: g, background: '#00b69b' }} title={`양호 ${Math.round(g * k)}건`} />
                  </span>
                  <b>{total}</b>
                </div>
              )
            })}
            <p className="note">※ 유형·등급 축은 시계열 차트와 동일 기간 조건으로 연동됩니다</p>
          </section>
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
    <div className="pills">
      {UNITS.map((u) => (
        <button key={u} className={`pill${value === u ? ' on' : ''}`} onClick={() => onChange(u)}>{u}</button>
      ))}
    </div>
  )
}

function BarCard({ title, color, data }) {
  return (
    <section className="card bars">
      <h3>{title}</h3>
      <span className="code">MCS-015</span>
      <div className="bars__base" />
      {data.map(([label, h, strong], i) => (
        <div key={label} className="bars__item" style={{ left: 45 + i * 66 }} title={`${label} · ${h * 2}건`}>
          <i style={{ height: h, background: strong ? `rgb(${color})` : `rgba(${color},0.32)` }} />
          <small>{label}</small>
        </div>
      ))}
    </section>
  )
}
