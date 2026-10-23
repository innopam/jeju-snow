import { useState } from 'react'
import { A } from '../assets.js'
import './fusion.css'

// UI-003 기상·제설 융합 분석 — 좌표는 Figma 프레임 기준에서 LNB(240)·타이틀(61)을 뺀 값
const ISSUE_BADGE = { '작업 누락': '#ffd2d5', '제설 취약': '#fff0bd' }
const ROADS = [
  {
    id: 1, name: '1100도로 · 성판악', issue: '작업 누락', pending: '미조치 6h', hot: true,
    pin: { x: 417, y: 368, size: 22, color: '#f93c65' }, card: { x: 190, y: 433, w: 232 },
    wx: ['-4.1℃', '적설 3.2cm · 풍속 7m/s'], road: ['-3.8℃', '아이스', '#ef4444', '수막 0.4mm'], car: ['4호', '05:40 이후 미통과', '#f93c65'],
  },
  {
    id: 2, name: '비자림로 · 송당', issue: '제설 취약', pending: '미조치 5h', hot: true,
    pin: { x: 707, y: 382, size: 18, color: '#f93c65' }, card: { x: 710, y: 455, w: 222 },
    wx: ['-3.0℃', '적설 2.1cm · 풍속 9m/s'], road: ['-2.4℃', '아이스', '#ef4444', '재결빙 진행'], car: ['—', '08:10 1회 살포 후 미재살포', '#f93c65'],
  },
  {
    id: 3, name: '5·16도로 · 교래', issue: '작업 누락', pending: '미조치 4h', hot: true,
    pin: { x: 609, y: 314, size: 18, color: '#f93c65' }, card: { x: 482, y: 51, w: 222 },
    wx: ['-2.6℃', '적설 1.8cm · 풍속 5m/s'], road: ['-2.9℃', '적설', '#ec4899', '적설심 2.0cm'], car: ['1호', '진행 중 · 구간 미도달', '#f93c65'],
  },
  {
    id: 4, name: '번영로 · 대천', issue: '작업 누락', pending: '미조치 3h', hot: false,
    pin: { x: 791, y: 309, size: 18, color: '#fcbe2d' }, card: { x: 712, y: 99, w: 222 },
    wx: ['-1.2℃', '강수 0.5mm · 습도 91%'], road: ['-0.4℃', '젖음', '#1d4ed8', '결빙 전이 주의'], car: ['7호', '10:30 인근 통과 · 미살포', '#999'],
  },
  {
    id: 5, name: '평화로 · 광령', issue: '제설 취약', pending: '미조치 2h', hot: false,
    pin: { x: 371, y: 260, size: 18, color: '#fcbe2d' }, card: { x: 156, y: 129, w: 222 },
    wx: ['-1.5℃', '습도 88% · 풍속 4m/s'], road: ['-1.2℃', '슬러시', '#f97316', '마찰 0.45'], car: ['—', '07:30 1회 살포', '#999'],
  },
]

const WEATHER_BARS = [
  ['적설3↑', 150, 96, true], ['적설1~3', 118, 76], ['-3℃↓', 134, 86, true], ['강수저온', 96, 61], ['습도80↑', 72, 46], ['맑음', 34, 22],
]
const SURFACE_BARS = [
  ['2℃', 12, 19, 'rgba(0,182,155,0.6)'], ['0℃', 21, 34, 'rgba(0,182,155,0.6)'], ['-1℃', 30, 48, 'rgba(252,190,45,0.6)'],
  ['-2℃', 38, 61, 'rgba(252,190,45,0.6)'], ['-3℃', 46, 74, 'rgba(249,60,101,0.9)'], ['-4℃', 54, 86, 'rgba(249,60,101,0.9)'], ['-5℃', 60, 96, 'rgba(249,60,101,0.9)'],
]
// 판정: 총 대응시간 기준 우수(≤45분) · 양호(≤60분, 목표) · 주의(≤75분) · 미흡(>75분)
const GRADE = { 우수: ['#c7f5ce', '#00b69b'], 양호: ['#bfdbfe', '#4880ff'], 주의: ['#fff0bd', '#bb4d00'], 미흡: ['#ffd2d5', '#d92338'] }
const gradeOf = (min) => (min <= 45 ? '우수' : min <= 60 ? '양호' : min <= 75 ? '주의' : '미흡')
const RESPONSE = [
  ['1100도로', 9, 25], ['평화로', 12, 29], ['5·16도로', 15, 37], ['번영로', 14, 41], ['비자림로', 22, 41], ['일주동로', 26, 44], ['남조로', 31, 52],
]
const PX_PER_MIN = 2.25 // 목표 60분 = 135px

export default function Fusion() {
  const [sel, setSel] = useState(1)
  const [sort, setSort] = useState('asc')
  const selRoad = ROADS.find((r) => r.id === sel)
  const response = [...RESPONSE].sort((a, b) => (sort === 'asc' ? 1 : -1) * (a[1] + a[2] - (b[1] + b[2])))
  const avg = (k) => RESPONSE.reduce((s, r) => s + r[k], 0) / RESPONSE.length
  const weak = [...ROADS].sort((a, b) => parseInt(b.pending.replace(/\D/g, ''), 10) - parseInt(a.pending.replace(/\D/g, ''), 10))

  return (
    <div className={`fusion${sel ? " has-sel" : ""}`}>
      <img className="fusion__map" src={A.mapFusion} alt="제주도 지도" />
      <img className="fusion__abs" src={A.fusionL4} alt="" style={{ left: 203, top: 41, width: 680, height: 650 }} />
      <img className="fusion__abs" src={A.fusionL2} alt="" style={{ left: 224, top: 41, width: 638, height: 650 }} />
      <img className="fusion__abs" src={A.fusionLinks} alt="" style={{ left: -240, top: -61, width: 1486, height: 1082 }} />

      {selRoad && (
        <img
          className="fusion__abs fusion__halo"
          src={A.fusionHalo}
          alt=""
          style={{ left: selRoad.pin.x + selRoad.pin.size / 2 - 18, top: selRoad.pin.y + selRoad.pin.size / 2 - 18, width: 36, height: 36 }}
        />
      )}
      {ROADS.map((r) => (
        <button
          key={r.id}
          className="fpin"
          style={{ left: r.pin.x, top: r.pin.y, width: r.pin.size, height: r.pin.size, background: r.pin.color, fontSize: r.pin.size > 20 ? 11 : 9.5 }}
          onClick={() => setSel((cur) => (cur === r.id ? null : r.id))}
          aria-label={r.name}
        >
          {r.id}
        </button>
      ))}
      {ROADS.map((r) => (
        <button key={r.id} className={`fcard${sel === r.id ? ' on' : ''}`} style={{ left: r.card.x, top: r.card.y, width: sel === r.id ? 232 : r.card.w }} onClick={() => setSel((cur) => (cur === r.id ? null : r.id))}>
          <span className="fcard__head">
            <i style={{ background: r.hot ? '#f93c65' : '#fcbe2d' }}>{r.id}</i>
            <b>{r.name}</b>
            <em className="badge" style={{ background: ISSUE_BADGE[r.issue] }}>{r.issue}</em>
            <span style={{ flex: 1 }} />
            <strong style={{ color: r.hot ? '#f93c65' : '#d98c00' }}>{r.pending}</strong>
          </span>
          <hr />
          <span className="fcard__line"><small>기상</small><b>{r.wx[0]}</b><span>{r.wx[1]}</span></span>
          <span className="fcard__line"><small>노면</small><b>{r.road[0]}</b><b className="tag" style={{ color: r.road[2] }}>{r.road[1]}</b><span>{r.road[3]}</span></span>
          <span className="fcard__line"><small>차량</small><b>{r.car[0]}</b><span style={{ color: r.car[2], fontWeight: r.car[2] === '#999' ? 400 : 500 }}>{r.car[1]}</span></span>
        </button>
      ))}

      {/* ① 기상조건 융합 분석 */}
      <section className="fpanel fpanel--bottom">
        <h3>① 기상조건 융합 분석</h3>
        <div className="vbars" style={{ left: 16 }}>
          <p>기상조건별 위험 발생 건수</p>
          <div className="vbars__plot">
            {WEATHER_BARS.map(([l, n, h, strong], i) => (
              <div key={l} className="vbars__item" style={{ left: i * 72.33, width: 64.33 }} title={`${l} · ${n}건`}>
                <small>{n}</small>
                <i style={{ height: h, background: strong ? '#4880ff' : 'rgba(72,128,255,0.35)' }} />
                <em>{l}</em>
              </div>
            ))}
          </div>
        </div>
        <div className="vbars" style={{ left: 462 }}>
          <p>노면온도 구간별 결빙 위험 발생률</p>
          <div className="vbars__plot">
            {SURFACE_BARS.map(([l, n, h, c], i) => (
              <div key={l} className="vbars__item" style={{ left: i * 62, width: 54 }} title={`노면 ${l} · ${n}%`}>
                <small>{n}%</small>
                <i style={{ height: h, background: c }} />
                <em>{l}</em>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="fcol">
        {/* ② 제설 대응시간 분석 */}
        <section className="fpanel fpanel--rank">
          <div className="rank__head">
            <h3>② 제설 대응시간 분석</h3>
            <button onClick={() => setSort((s) => (s === 'asc' ? 'desc' : 'asc'))}>{sort === 'asc' ? '빠른 순 ↑' : '느린 순 ↓'}</button>
          </div>
          <p className="rank__sub">적설·결빙 발생 → 출동 → 살포 완료 · 총 대응시간 {sort === 'asc' ? '오름차순' : '내림차순'}</p>
          <div className="rank__legend">
            <span><i style={{ background: '#9b98dc' }} />출동 소요 (발생→출동)</span>
            <span><i style={{ background: '#37348f' }} />살포 소요 (출동→완료)</span>
            <span><i className="goal" />목표 60분</span>
          </div>
          <div className="rank__list">
            {response.map(([name, go, spray], i) => {
              const grade = gradeOf(go + spray)
              return (
              <div key={name} className={`rank-row${i === 0 ? ' top' : ''}`} title={`${name} · 총 ${go + spray}분 (${grade})`}>
                <small>{i + 1}</small>
                <div className="rank-row__info">
                  <p><b>{name}</b><em className="badge" style={{ background: GRADE[grade][0] }}>{grade}</em></p>
                  <small>출동 {go}분 + 살포 {spray}분</small>
                  <span className="rank-row__bar">
                    <i style={{ width: go * PX_PER_MIN, background: '#9b98dc' }} />
                    <i style={{ width: spray * PX_PER_MIN, background: '#37348f' }} />
                    <i className="goal" />
                  </span>
                </div>
                <p className="rank-row__val" style={{ color: GRADE[grade][1] }}>
                  <b>{go + spray}</b>
                  <small>분</small>
                </p>
              </div>
              )
            })}
          </div>
          <div className="rank__sum">
            <b>전체 평균</b>
            <span>출동 {avg(1).toFixed(1)}분 · 살포 {avg(2).toFixed(1)}분 · 총 {(avg(1) + avg(2)).toFixed(1)}분</span>
          </div>
        </section>

        {/* ③ 미제설 취약구간 교차 분석 */}
        <section className="fpanel fpanel--weak">
          <h3>③ 미제설 취약구간 교차 분석</h3>
          <p className="weak__title">취약구간 목록</p>
          <div className="weak__rows">
            {weak.map((r) => (
              <button key={r.id} className={`weak-row${sel === r.id ? ' on' : ''}`} onClick={() => setSel((cur) => (cur === r.id ? null : r.id))} aria-pressed={sel === r.id}>
                <small>{r.id}</small>
                <span className="weak-row__main">
                  <em className="badge" style={{ background: ISSUE_BADGE[r.issue] }}>{r.issue}</em>
                  <b>{r.name}</b>
                </span>
                <strong style={{ color: r.hot ? '#f93c65' : '#fcbe2d' }}>{r.pending}</strong>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
