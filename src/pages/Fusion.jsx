import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Dropdown } from '../components/Controls.jsx'
import Feature from 'ol/Feature.js'
import LineString from 'ol/geom/LineString.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import { boundingExtent } from 'ol/extent.js'
import { Stroke, Style } from 'ol/style.js'
import { A, VEHICLE_ICONS } from '../assets.js'
import { JEJU_CENTER, ROUTES, SEGMENTS_GEO, VEHICLES_GEO, vehicleTrack } from '../data/geo.js'
import { createBaseLayers } from '../map/basemap.js'
import { fromLonLat, useOlMap } from '../map/useOlMap.js'
import { BP, useMedia } from '../useMedia.js'
import './fusion.css'

// UI-SIRS-003 기상·제설 융합 분석 — 교차 분석 지도는 OpenLayers + K-Geo플랫폼(브이월드) 배경지도
// card.dx/dy: 구간 마커 기준 상세 카드 위치(px)
const ISSUE_BADGE = { '작업 누락': '#ffd2d5', '제설 취약': '#fff0bd' }
const ROADS = [
  {
    id: 1, name: '1100도로 · 성판악', issue: '작업 누락', pending: '미조치 6h', hot: true,
    seg: 'K-12', route: '1100도로', vehicle: 1, pin: { size: 22, color: '#f93c65' }, card: { dx: -114, dy: 263, w: 232 },
    wx: ['-4.1℃', '적설 3.2cm · 풍속 7m/s'], road: ['-3.8℃', '아이스', '#ef4444', '수막 0.4mm'], car: ['4호', '05:40 이후 미통과', '#f93c65'],
  },
  {
    id: 2, name: '비자림로 · 송당', issue: '제설 취약', pending: '미조치 5h', hot: true,
    seg: 'V-2', route: '비자림로', vehicle: null, pin: { size: 18, color: '#f93c65' }, card: { dx: -88, dy: 97, w: 222 },
    wx: ['-3.0℃', '적설 2.1cm · 풍속 9m/s'], road: ['-2.4℃', '아이스', '#ef4444', '재결빙 진행'], car: ['—', '08:10 1회 살포 후 미재살포', '#f93c65'],
  },
  {
    id: 3, name: '5·16도로 · 교래', issue: '작업 누락', pending: '미조치 4h', hot: true,
    seg: 'K-16-2', route: '5·16도로', vehicle: 7, pin: { size: 18, color: '#f93c65' }, card: { dx: -112, dy: -187, w: 222 },
    wx: ['-2.6℃', '적설 1.8cm · 풍속 5m/s'], road: ['-2.9℃', '적설', '#ec4899', '적설심 2.0cm'], car: ['1호', '진행 중 · 구간 미도달', '#f93c65'],
  },
  {
    id: 4, name: '번영로 · 대천', issue: '작업 누락', pending: '미조치 3h', hot: false,
    seg: 'B-4', route: '번영로', vehicle: 4, pin: { size: 18, color: '#fcbe2d' }, card: { dx: -111, dy: -293, w: 222 },
    wx: ['-1.2℃', '강수 0.5mm · 습도 91%'], road: ['-0.4℃', '젖음', '#1d4ed8', '결빙 전이 주의'], car: ['7호', '10:30 인근 통과 · 미살포', '#999'],
  },
  {
    id: 5, name: '평화로 · 광령', issue: '제설 취약', pending: '미조치 2h', hot: false,
    seg: 'P-2', route: '평화로', vehicle: null, pin: { size: 18, color: '#fcbe2d' }, card: { dx: -110, dy: -164, w: 222 },
    wx: ['-1.5℃', '습도 88% · 풍속 4m/s'], road: ['-1.2℃', '슬러시', '#f97316', '마찰 0.45'], car: ['—', '07:30 1회 살포', '#999'],
  },
]

// 기상조건별 위험요소 발생 (적설 · 결빙 건수)
// [조건, 합계, 적설 막대 폭, 결빙 막대 폭] — 막대 폭은 시안 값(트랙 197 기준)
const WEATHER_ROWS = [
  ['강설 3cm/h 이상', 150, 148, 50], ['강설 1~3cm/h', 118, 102, 53], ['기온 -3℃ 이하 (무강수)', 134, 84, 92],
  ['강수 후 기온 하강', 96, 74, 53], ['습도 80%↑ · 0℃ 내외', 72, 61, 35], ['맑음 · 영상', 34, 21, 24],
]
const WEATHER_TRACK = 197
// 기온 × 강수 형태별 위험 발생률(%) — 셀 등급: 관심 <30 · 주의 30~60 · 경계 60~80 · 심각 ≥80
const PRECIP = ['없음', '비', '진눈깨비', '눈']
const MATRIX = [
  ['0℃ 이상', [3, 8, 15, 22]], ['0 ~ -2℃', [12, 31, 44, 52]], ['-2 ~ -4℃', [26, 47, 61, 68]], ['-4℃ 이하', [38, 55, 72, 81]],
]
const CELL = [[80, '#f93c65', '#fff', '심각'], [60, '#ff8a3d', '#fff', '경계'], [30, '#fcbe2d', '#5c4300', '주의'], [0, '#eef0f3', '#6b7280', '관심']]
const cellOf = (v) => CELL.find(([min]) => v >= min)
const SURFACE_BARS = [['2℃', 12], ['0℃', 21], ['-1℃', 30], ['-2℃', 38], ['-3℃', 46], ['-4℃', 54], ['-5℃↓', 60]]
const surfaceColor = (v) => (v >= 60 ? '#ff8a3d' : v >= 30 ? '#fcbe2d' : '#c9cdd3')
const SUMMARY = [
  ['심각', '#f93c65', 'rgba(249,60,101,0.16)', '기온 -4℃ 이하 + 강설 시 발생률 81%', '강설 예보 시 중산간 노선 사전 제설 투입'],
  ['경계', '#ff8a3d', 'rgba(255,138,61,0.16)', '기온 -2℃ 이하 + 진눈깨비·눈 시 61% 이상', '제설제 사전 살포 · 순찰 강화'],
  ['주의', '#b7860b', 'rgba(252,190,45,0.16)', '강수 후 기온 하강 시 블랙아이스 비중 54%', '노면온도 -1℃ 도달 전 재살포'],
]
const FILTERS = [
  ['행정시', ['전체', '제주시', '서귀포시']],
  ['노선', ['전체 노선', '1100도로', '5·16도로', '평화로', '번영로', '비자림로', '산록도로', '남조로']],
  ['기상 조건', ['전체', '강설', '저온(무강수)', '강수 후 기온 하강', '고습']],
  ['위험 유형', ['전체', '적설', '결빙']],
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
  const { setToast } = useOutletContext() ?? {}
  const [tab, setTab] = useState('weather')
  const [cell, setCell] = useState(null) // 기온×강수 매트릭스에서 고른 셀 [행, 열]
  const [filters, setFilters] = useState(() => FILTERS.map(([, o]) => o[0]))
  const selRoad = ROADS.find((r) => r.id === sel)
  const response = [...RESPONSE].sort((a, b) => (sort === 'asc' ? 1 : -1) * (a[1] + a[2] - (b[1] + b[2])))
  // 교차 분석 지도 — 노선 라인(취약구간 노선 강조) · 차량 궤적(점선)
  const { elRef, mapRef, tick, pixelOf, sizeOf } = useOlMap({
    center: JEJU_CENTER,
    zoom: 10,
    layers: () => {
      const base = createBaseLayers()
      const src = new VectorSource()
      ROUTES.forEach((route) => {
        const hit = ROADS.find((r) => r.route === route.name)
        const f = new Feature(new LineString(route.coords.map((c) => fromLonLat(c))))
        f.setStyle(hit
          ? [new Style({ stroke: new Stroke({ color: '#fff', width: 9 }) }), new Style({ stroke: new Stroke({ color: hit.hot ? '#f93c65' : '#fcbe2d', width: 5, lineCap: 'round' }) })]
          : new Style({ stroke: new Stroke({ color: 'rgba(72,128,255,0.8)', width: 4, lineCap: 'round' }) }))
        src.addFeature(f)
      })
      ROADS.filter((r) => r.vehicle).forEach((r) => {
        const v = VEHICLES_GEO.find((x) => x.id === r.vehicle)
        const f = new Feature(new LineString(vehicleTrack(v).trail.map((c) => fromLonLat(c))))
        f.setStyle(new Style({ stroke: new Stroke({ color: '#262728', width: 2, lineDash: [5, 5] }) }))
        src.addFeature(f)
      })
      return [...base.normal, new VectorLayer({ source: src })]
    },
  })
  const stacked = useMedia(BP.tablet) // 태블릿·모바일: 지도 위, 분석 패널 아래로 쌓음
  useEffect(() => {
    // 지도 영역에 제주 전역 맞춤 (데스크톱은 오른쪽 분석 패널·아래 차트를 제외한 영역) — 창 크기가 바뀌면 다시 맞춤
    const fit = () => {
      const map = mapRef.current
      if (!map) return
      map.updateSize()
      const all = ROUTES.flatMap((r) => r.coords).concat([[126.18, 33.3], [126.93, 33.45]])
      map.getView().fit(boundingExtent(all.map((c) => fromLonLat(c))), { padding: stacked ? [40, 30, 30, 30] : [130, 470, 40, 40] })
    }
    fit()
    let t = 0
    const onResize = () => { clearTimeout(t); t = setTimeout(fit, 150) }
    window.addEventListener('resize', onResize)
    return () => { clearTimeout(t); window.removeEventListener('resize', onResize) }
  }, [stacked, mapRef])
  void tick
  const px = (r) => pixelOf(SEGMENTS_GEO[r.seg]) ?? [-999, -999]
  // 상세 카드 위치 — 마커 기준 오프셋에 두되, 지도 보이는 영역(데스크톱은 오른쪽 분석 패널·아래 차트 제외) 밖으로 나가지 않게 고정
  const CARD_H = 104
  const GAP = 10
  const [mw, mh] = sizeOf() ?? [1246, 919]
  // 데스크톱: 위 조회 조건 카드(100px)와 오른쪽 분석 패널(426px)을 피한다
  const bounds = stacked ? { top: GAP, right: mw - GAP, bottom: mh - GAP } : { top: 110, right: mw - 426 - GAP, bottom: mh - GAP }
  // 지도 보이는 영역이 좁으면 카드끼리 겹치므로 선택한 구간 카드만 표시
  const compact = bounds.right < 760 || bounds.bottom < 460
  const cardShown = (r) => !compact || sel === r.id
  const cardPos = (r) => {
    const p = px(r)
    const w = sel === r.id ? 232 : r.card.w
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
    const left = clamp(p[0] + r.card.dx, GAP, Math.max(GAP, bounds.right - w))
    const top = clamp(p[1] + r.card.dy, bounds.top, Math.max(bounds.top, bounds.bottom - CARD_H))
    return { left, top, w }
  }
  const weak = [...ROADS].sort((a, b) => parseInt(b.pending.replace(/\D/g, ''), 10) - parseInt(a.pending.replace(/\D/g, ''), 10))

  return (
    <div className={`fusion${sel ? " has-sel" : ""}`}>
      <div className="fusion__mapwrap">
      <div ref={elRef} className="fusion__ol" />
      <div className="fusion__overlays">
        <svg className="fusion__links" width="100%" height="100%">
          {ROADS.filter(cardShown).map((r) => {
            const p = px(r)
            const c = cardPos(r)
            const x2 = Math.max(c.left, Math.min(c.left + c.w, p[0]))
            const y2 = c.top + CARD_H / 2 < p[1] ? c.top + CARD_H - 8 : c.top
            return <line key={r.id} x1={p[0]} y1={p[1]} x2={x2} y2={y2} className={sel === r.id ? 'on' : ''} />
          })}
        </svg>
        {ROADS.filter((r) => r.vehicle).map((r) => {
          const v = VEHICLES_GEO.find((x) => x.id === r.vehicle)
          const t = vehicleTrack(v)
          const p = pixelOf(v.at) ?? [-99, -99]
          const a = pixelOf(t.from) ?? [0, 0]
          const b = pixelOf(t.to) ?? [1, 0]
          return <img key={r.id} className="fusion__veh" src={VEHICLE_ICONS[v.id]} alt="" style={{ left: p[0], top: p[1], transform: `translate(-50%, -50%) rotate(${(Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI}deg)` }} />
        })}
        {selRoad && <img className="fusion__halo" src={A.fusionHalo} alt="" style={{ left: px(selRoad)[0] - 18, top: px(selRoad)[1] - 18 }} />}
        {ROADS.map((r) => {
          const p = px(r)
          return (
            <button
              key={r.id}
              className="fpin"
              style={{ left: p[0] - r.pin.size / 2, top: p[1] - r.pin.size / 2, width: r.pin.size, height: r.pin.size, background: r.pin.color, fontSize: r.pin.size > 20 ? 11 : 9.5 }}
              onClick={() => setSel((cur) => (cur === r.id ? null : r.id))}
              aria-label={r.name}
            >
              {r.id}
            </button>
          )
        })}
      {ROADS.filter(cardShown).map((r) => (
        <button key={r.id} className={`fcard${sel === r.id ? ' on' : ''}`} style={{ left: cardPos(r).left, top: cardPos(r).top, width: cardPos(r).w }} onClick={() => setSel((cur) => (cur === r.id ? null : r.id))}>
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

      </div>
      </div>

      {/* 분석 조건 */}
      <section className="fcond">
        <div className="fcond__field">
          <small>분석 기간</small>
          <button className="dropdown" style={{ width: 290, height: 40 }} onClick={() => setToast?.('분석 기간 선택 (목업) — 2025.12.01 ~ 2026.02.28 동절기')}>
            <span>2025.12.01 ~ 2026.02.28</span>
            <img src={A.icChevronDown} alt="" />
          </button>
        </div>
        {FILTERS.map(([label, options], i) => (
          <div key={label} className="fcond__field">
            <small>{label}</small>
            <Dropdown value={filters[i]} options={options} onChange={(v) => setFilters((f) => f.map((x, k) => (k === i ? v : x)))} width={150} height={40} />
          </div>
        ))}
        <span style={{ flex: 1 }} />
        <div className="fcond__actions">
          <button className="btn-gray" onClick={() => { setFilters(FILTERS.map(([, o]) => o[0])); setCell(null) }}>초기화</button>
          <button className="btn-primary" onClick={() => setToast?.('조회 조건을 적용했습니다 (목업 데이터).')}>조회</button>
        </div>
      </section>

      {/* 우측 분석 패널 — 기상조건 융합 분석 / 제설 대응·취약구간 분석 */}
      <aside className="fside">
        <div className="tabs-line" role="tablist">
          {[['weather', '기상조건 융합 분석'], ['response', '제설 대응/취약구간 분석']].map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
              <span>{l}</span>
              <i />
            </button>
          ))}
        </div>
        {tab === 'weather' ? (
          <>
            <p className="fside__basis">2025.12.01 ~ 2026.02.28 · 위험요소 604건 · 기상 관측 12개소 (기상청 AWS·관내 기상센서)</p>
            <div className="fside__head">
              <p className="fside__title">기상조건별 위험요소 발생</p>
              <span className="fside__legend">
                <span><i style={{ background: '#4880ff' }} />적설</span>
                <span><i style={{ background: '#9dbbff' }} />결빙</span>
              </span>
              <small>단위: 건</small>
            </div>
            <div className="wxbars">
              {WEATHER_ROWS.map(([label, total, snow, ice]) => {
                const snowN = Math.round((total * snow) / (snow + ice))
                return (
                  <div key={label} className="wxbars__row" title={`${label} · 적설 ${snowN}건 · 결빙 ${total - snowN}건`}>
                    <span>{label}</span>
                    <span className="wxbars__bar">
                      <i style={{ width: `${(snow / WEATHER_TRACK) * 100}%`, background: '#4880ff' }} />
                      <i style={{ width: `${(ice / WEATHER_TRACK) * 100}%`, background: '#9dbbff' }} />
                    </span>
                    <b>{total}</b>
                  </div>
                )
              })}
            </div>
            <hr className="fside__hr" />
            <div className="fside__head">
              <p className="fside__title">기온 × 강수 형태별 위험 발생률</p>
              <small>단위: %</small>
            </div>
            <div className="matrix">
              <div className="matrix__row matrix__row--th">
                <span>기온 \ 강수</span>
                {PRECIP.map((p) => <span key={p}>{p}</span>)}
              </div>
              {MATRIX.map(([t, vals], r) => (
                <div key={t} className="matrix__row">
                  <span>{t}</span>
                  {vals.map((v, c) => {
                    const [, bg, fg, grade] = cellOf(v)
                    const on = cell?.[0] === r && cell?.[1] === c
                    return (
                      <button
                        key={c}
                        className={on ? 'on' : ''}
                        style={{ background: bg, color: fg }}
                        title={`${t} × ${PRECIP[c]} · ${v}% (${grade})`}
                        onClick={() => {
                          setCell(on ? null : [r, c])
                          if (!on) setToast?.(`${t} × ${PRECIP[c]} 조건 발생 구간을 지도에 표시합니다 (목업).`)
                        }}
                      >
                        {v}%
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
            <div className="fside__legend fside__legend--grade">
              {[...CELL].reverse().map(([min, bg, , g], i, arr) => (
                <span key={g}><i style={{ background: bg }} />{g} {i === 0 ? '30% 미만' : i === arr.length - 1 ? `${min} 이상` : `${min}~${arr[i + 1][0]}`}</span>
              ))}
            </div>
            <p className="fside__note">발생률 = 해당 기상조건 지속 시간 중 위험요소가 발생한 시간 비율 · 셀 선택 시 지도에 해당 조건 발생 구간 표시</p>
            <hr className="fside__hr" />
            <div className="fside__head">
              <p className="fside__title">노면온도 구간별 결빙 위험 발생률</p>
              <small>단위: %</small>
            </div>
            <div className="sbars">
              {SURFACE_BARS.map(([l, v]) => (
                <div key={l} className="sbars__item" title={`노면 ${l} · ${v}%`}>
                  <small>{v}%</small>
                  <i style={{ height: v * 1.6, background: surfaceColor(v) }} />
                  <em>{l}</em>
                </div>
              ))}
            </div>
            <hr className="fside__hr" />
            <div className="fside__head">
              <p className="fside__title">분석 요약 · 사전 대응 기준</p>
            </div>
            <div className="fsum">
              {SUMMARY.map(([g, fg, bg, title, act]) => (
                <div key={g} className="fsum__row">
                  <em style={{ color: fg, background: bg }}>{g}</em>
                  <p><b>{title}</b><span>→ {act}</span></p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="fside__head fside__head--sm">
              <p className="fside__title">제설 대응시간 분석</p>
              <button className="fside__sort" onClick={() => setSort((x) => (x === 'asc' ? 'desc' : 'asc'))}>{sort === 'asc' ? '빠른 순 ↑' : '느린 순 ↓'}</button>
            </div>
            <div className="rank__list">
              {response.map(([name, go, spray], i) => {
                const grade = gradeOf(go + spray)
                return (
                  <div key={name} className={`rank-row${i === 0 ? ' top' : ''}`} title={`${name} · 총 ${go + spray}분 (${grade}) · 목표 60분`}>
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
            <div className="fside__head fside__head--sm">
              <p className="fside__title">미제설 취약 구간 교차 분석</p>
            </div>
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
          </>
        )}
      </aside>
    </div>
  )
}
