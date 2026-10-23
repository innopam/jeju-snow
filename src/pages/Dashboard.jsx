import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useOutletContext } from 'react-router-dom'
import { A, VEHICLE_ICONS, TRAIL_ICONS } from '../assets.js'
import { Checkbox, Radio } from '../components/Controls.jsx'
import { CCTV, MAP_VEHICLES, TRAILS, VEHICLES, WEATHER } from '../data/dashboard.js'
import { KM_PER_PX, RISK_COLOR, ROUTE_LABELS, SEGMENTS, STATE_COLOR, nearestRegion, segName } from '../data/segments.js'
import DashboardPanel from './dashboard/DashboardPanel.jsx'
import VehiclePanel from './dashboard/VehiclePanel.jsx'
import VehiclePopup from './dashboard/VehiclePopup.jsx'
import './dashboard.css'

// UI-SIRS-001-01 ~ 04 통합 관제 대시보드
const BASE_LAYERS = ['기상정보', '연속지적도', '적설 감시 CCTV']
const SECTION_LAYERS = ['주요 교통량 축', '제설 우선노선', '상습 결빙/파손 구간', '재결빙 위험 구간', '블랙아이스 및 위험구간']
const MODES = [
  { key: 'status', label: '제설 작업 상태' },
  { key: 'count', label: '제설 작업 횟수' },
  { key: 'surface', label: '노면 상태' },
]
const LEGENDS = {
  status: { title: '구간', items: [['#f93c65', '미작업'], ['#ff8a3d', '제설 필요'], ['#fcbe2d', '진행'], ['#00b69b', '완료'], [null, '재결빙 주의']] },
  count: { title: '제설 횟수', items: [['#334155', '미작업'], ['#2563eb', '1회'], ['#f97316', '2회'], ['#0d9488', '3회'], ['#7e22ce', '4회']] },
  surface: {
    title: '도로상태',
    items: [['#334155', '오류'], ['#22c55e', '건조'], ['#60a5fa', '습기'], ['#1d4ed8', '젖음'], ['#ec4899', '적설'], ['#ef4444', '아이스'], ['#f97316', '슬러시']],
  },
}
// 노선 상세(1100도로) 구간별 제설 횟수 라벨 (UI-SIRS-001-02·03)
const COUNT_LABELS = [
  [620, 110, 2, '어승생 입구', '09:42'], [632, 221, 3, '어리목', '10:05'], [635, 350, 4, '1100고지', '10:18'], [573, 432, 3, '영실 입구', '09:55'],
  [559, 579, 2, '거린사슴', '09:20'], [547, 667, 1, '서귀포자연휴양림', '08:40'], [508, 803, 1, '중문 방면', '08:15'],
].map(([x, y, n, place, at]) => ({ x: 17 + x, y: 17 + y, n, place, at }))
const COUNT_COLORS = { 1: '#2563eb', 2: '#f97316', 3: '#0d9488', 4: '#7e22ce' }
const SURFACE_AT = ['아이스 · -3.8℃', '슬러시 · -1.2℃', '적설 · -2.1℃', '아이스 · -3.1℃', '젖음 · -0.4℃', '아이스 · -2.6℃', '젖음 · 0.3℃']

const ORIGIN = { x: 560, y: 430 } // 지도 확대 기준점
const PANEL_W = 380
const toScreen = (p, v) => ({ x: ORIGIN.x + (p.x - ORIGIN.x) * v.z + v.x, y: ORIGIN.y + (p.y - ORIGIN.y) * v.z + v.y })
const toBase = (s, v) => ({ x: ORIGIN.x + (s.x - v.x - ORIGIN.x) / v.z, y: ORIGIN.y + (s.y - v.y - ORIGIN.y) / v.z })

export default function Dashboard() {
  const { setToast } = useOutletContext()
  const location = useLocation()
  const [layers, setLayers] = useState(() => new Set(['기상정보', '연속지적도', '적설 감시 CCTV', '주요 교통량 축', '제설 우선노선', '재결빙 위험 구간']))
  const [layerOpen, setLayerOpen] = useState(true)
  const [layerQuery, setLayerQuery] = useState('')
  const [mode, setMode] = useState('status')
  const [basemap, setBasemap] = useState('normal')
  const [tab, setTab] = useState('dashboard')
  const [panelOpen, setPanelOpen] = useState(true)
  const [legendOpen, setLegendOpen] = useState(true)
  const [segCode, setSegCode] = useState('K-12')
  const [selected, setSelected] = useState(null) // VEHICLES index
  const [view, setView] = useState({ x: 0, y: 0, z: 1 })
  const [tool, setTool] = useState(null) // 'distance' | 'area'
  const [points, setPoints] = useState([])
  const [size, setSize] = useState({ w: 1246, h: 919 })
  const mapRef = useRef(null)
  const drag = useRef(null)

  useLayoutEffect(() => {
    const el = mapRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const visibleCenter = { x: (size.w - (panelOpen ? PANEL_W : 0)) / 2, y: size.h / 2 }
  const centerOn = (p, z = view.z) => setView({ z, x: visibleCenter.x - ORIGIN.x - (p.x - ORIGIN.x) * z, y: visibleCenter.y - ORIGIN.y - (p.y - ORIGIN.y) * z })

  // 알림 선택 → 해당 구간으로 지도 이동 (UC-EVT-001 기본 흐름 4)
  const focus = location.state
  useEffect(() => {
    if (!focus?.focusSeg) return
    const s = SEGMENTS.find((x) => x.code === focus.focusSeg)
    if (!s) return
    setMode('status')
    setTab('dashboard')
    setSelected(null)
    setSegCode(s.code)
    centerOn(s, 1.3)
    setToast(`${segName(s)} 구간으로 이동했습니다.`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce])

  const toggleLayer = (name) =>
    setLayers((s) => {
      const n = new Set(s)
      if (n.has(name)) n.delete(name)
      else n.add(name)
      return n
    })

  const changeMode = (m) => {
    setMode(m)
    setView({ x: 0, y: 0, z: 1 })
    setTool(null)
    setPoints([])
  }
  const zoom = (d) => setView((v) => ({ ...v, z: Math.min(2.4, Math.max(0.6, +(v.z + d).toFixed(2))) }))

  // 지도 이동(드래그)·측정 클릭
  const localPoint = (e) => {
    const r = mapRef.current.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const onPointerDown = (e) => {
    if (e.button !== 0 || e.target.closest('button')) return
    drag.current = { sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d) return
    if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 4) d.moved = true
    if (d.moved) setView((v) => ({ ...v, x: d.ox + e.clientX - d.sx, y: d.oy + e.clientY - d.sy }))
  }
  const onPointerUp = (e) => {
    const d = drag.current
    drag.current = null
    if (d && !d.moved && tool) setPoints((p) => [...p, toBase(localPoint(e), view)])
  }
  const startTool = (t) => {
    setPoints([])
    setTool((cur) => (cur === t ? null : t))
    if (tool !== t) setToast(t === 'distance' ? '지도를 클릭해 거리를 잴 지점을 찍으세요. (Esc: 종료)' : '지도를 클릭해 면적을 잴 영역을 그리세요. (Esc: 종료)')
  }
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && (setTool(null), setPoints([]))
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [])

  const measure = useMemo(() => {
    if (points.length < 2) return null
    const km = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) * KM_PER_PX
    if (tool === 'distance') return `${points.slice(1).reduce((s, p, i) => s + km(points[i], p), 0).toFixed(2)} km`
    if (points.length < 3) return null
    const area = Math.abs(points.reduce((s, p, i) => { const q = points[(i + 1) % points.length]; return s + p.x * q.y - q.x * p.y }, 0)) / 2
    return `${(area * KM_PER_PX ** 2).toFixed(2)} km²`
  }, [points, tool])

  const island = mode === 'status'
  const region = nearestRegion(...Object.values(toBase(visibleCenter, view)))
  const seg = SEGMENTS.find((s) => s.code === segCode)
  const selectedVehicle = selected != null ? VEHICLES[selected] : null
  const selectedMap = selectedVehicle?.mapId ? MAP_VEHICLES.find((m) => m.id === selectedVehicle.mapId) : null

  // UC-GIS-005: 차량 선택 시 위치·궤적을 지도에 표출
  const selectVehicle = (idx) => {
    setSelected(idx)
    const m = MAP_VEHICLES.find((x) => x.id === VEHICLES[idx]?.mapId)
    if (m && mode === 'status') centerOn(m, Math.max(view.z, 1))
  }
  const selectMapVehicle = (mapId) => {
    const idx = VEHICLES.findIndex((v) => v.mapId === mapId)
    if (idx < 0) return setToast(`${mapId}호 차량은 단말 미등록 차량입니다 (목업).`)
    setTab('vehicles')
    setPanelOpen(true)
    selectVehicle(idx)
  }

  const showLayer = (l) => layers.has(l)
  const filteredBase = BASE_LAYERS.filter((l) => l.includes(layerQuery.trim()))
  const filteredSection = SECTION_LAYERS.filter((l) => l.includes(layerQuery.trim()))
  const legend = LEGENDS[mode]
  const segScreen = seg && toScreen(seg, view)
  const labelScreen = selectedMap && toScreen(selectedMap, view)
  const measureLast = points.length ? toScreen(points[points.length - 1], view) : null

  return (
    <div className={`dash${panelOpen ? '' : ' panel-closed'}${tool ? ' measuring' : ''}`}>
      {/* ── 지도 ─────────────────────────────────── */}
      <div ref={mapRef} className="map" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => (drag.current = null)}>
        <div className="map__world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}>
          {island ? (
            <>
              <img className={`map__base map__base--island${basemap === 'satellite' ? ' satellite' : ''}`} src={A.mapIsland} alt="제주도 지도" draggable={false} />
              {showLayer('연속지적도') && <div className="cadastral" />}
              {showLayer('주요 교통량 축') &&
                ROUTE_LABELS.filter((r) => r.traffic).map((r) => (
                  <span key={`t-${r.name}`} className="route-tag traffic" style={{ left: r.x, top: r.y + 20 }}>교통량 축</span>
                ))}
              {showLayer('제설 우선노선') &&
                ROUTE_LABELS.filter((r) => r.priority).map((r) => (
                  <span key={`p-${r.name}`} className="route-tag priority" style={{ left: r.x, top: r.y }}>우선 · {r.name}</span>
                ))}
              {tab === 'vehicles' &&
                TRAILS.map((t) => {
                  const on = selectedMap?.id === t.id
                  return (
                    <img key={t.id} className={`map__abs trail${selectedMap ? (on ? ' on' : ' dim') : ''}`} src={TRAIL_ICONS[t.id]} alt="" style={{ left: t.x, top: t.y, width: t.w, height: t.h }} />
                  )
                })}
              {showLayer('적설 감시 CCTV') &&
                CCTV.map((c) => (
                  <button key={c.id} className="cctv" style={{ left: c.x, top: c.y }} onClick={() => setToast(`적설 감시 CCTV #${c.id} 영상 연결 (목업)`)} title={`적설 감시 CCTV #${c.id}`}>
                    <img src={A.icCctv} alt="" />
                  </button>
                ))}
              {SEGMENTS.map((s) => (
                <button
                  key={s.code}
                  className={`seg-dot${segCode === s.code && tab === 'dashboard' ? ' on' : ''}`}
                  style={{ left: s.x, top: s.y, '--c': STATE_COLOR[s.state] }}
                  onClick={() => { setSegCode(s.code); setTab('dashboard') }}
                  title={`${segName(s)} · ${s.state}`}
                  aria-label={segName(s)}
                >
                  {showLayer('재결빙 위험 구간') && s.refreeze && <i className="mk refreeze" />}
                  {showLayer('블랙아이스 및 위험구간') && s.blackice && <em className="mk-tag ice">블랙아이스</em>}
                  {showLayer('상습 결빙/파손 구간') && s.habitual && <em className="mk-tag habitual">상습</em>}
                </button>
              ))}
              {selectedMap && <span className="veh-ring" style={{ left: selectedMap.x, top: selectedMap.y }} />}
              {MAP_VEHICLES.map((m) => (
                <button key={m.id} className="veh" style={{ left: m.x, top: m.y, transform: `translate(-50%, -50%) rotate(${m.rot}deg)` }} onClick={() => selectMapVehicle(m.id)} title={`${m.id}호 · ${m.type} · ${m.road}`}>
                  <img src={VEHICLE_ICONS[m.id]} alt="" draggable={false} />
                </button>
              ))}
              {showLayer('기상정보') &&
                WEATHER.map((w) => (
                  <span key={w.name} className="wx" style={{ left: w.x, top: w.y }}>
                    <img src={w.icon} alt="" />
                    <span>{w.name}</span>
                    <b className={w.temp < 0 ? 'cold' : ''}>{w.temp.toFixed(1)}°</b>
                  </span>
                ))}
            </>
          ) : (
            <>
              <img className="map__base map__base--zoom" src={A.mapZoom} alt="1100도로 확대 지도" draggable={false} />
              {mode === 'count' ? (
                <>
                  <img className="map__abs" src={A.routeWorkCount} alt="" style={{ left: 420.79, top: 38.8, width: 193.08, height: 848.52 }} />
                  <img className="map__abs" src={A.vehZoomType01} alt="" style={{ left: 433, top: 553, width: 44, height: 28 }} />
                  <ZoomVehicle src={A.vehZoom3} x={559.96} y={423.34} w={84.96} h={54.07} rot={138.57} />
                </>
              ) : (
                <>
                  <img className="map__abs" src={A.routeSurface} alt="" style={{ left: 411.92, top: 33.8, width: 193.08, height: 848.52 }} />
                  {COUNT_LABELS.map((l, i) => (
                    <span key={i} className="count-label" style={{ left: l.x, top: l.y, color: COUNT_COLORS[l.n], borderColor: COUNT_COLORS[l.n] }} title={`${l.place} · 제설 ${l.n}회 · 최근 ${l.at} · 노면 ${SURFACE_AT[i]}`}>
                      {l.n}회
                    </span>
                  ))}
                  <ZoomVehicle src={A.vehZoom1} x={569.48} y={148.6} w={70.48} h={44.85} rot={92} />
                  <ZoomVehicle src={A.vehZoom9} x={513.42} y={468.98} w={70.48} h={44.85} rot={-76} />
                </>
              )}
            </>
          )}
        </div>
        {/* 거리·면적 재기 */}
        {points.length > 0 && (
          <svg className="measure" width="100%" height="100%">
            {tool === 'area' && points.length > 2 ? (
              <polygon points={points.map((p) => { const s = toScreen(p, view); return `${s.x},${s.y}` }).join(' ')} />
            ) : (
              <polyline points={points.map((p) => { const s = toScreen(p, view); return `${s.x},${s.y}` }).join(' ')} />
            )}
            {points.map((p, i) => { const s = toScreen(p, view); return <circle key={i} cx={s.x} cy={s.y} r="4" /> })}
          </svg>
        )}
        {measure && measureLast && (
          <span className="measure-label" style={{ left: measureLast.x + 10, top: measureLast.y - 28 }}>
            {tool === 'distance' ? '총 거리' : '면적'} {measure}
            <button onClick={() => { setPoints([]); setTool(null) }} aria-label="측정 종료">×</button>
          </span>
        )}
      </div>

      {/* ── 지도 위 고정 UI ───────────────────────── */}
      <section className={`layer-panel${layerOpen ? '' : ' closed'}`}>
        <button className="layer-panel__title" onClick={() => setLayerOpen((o) => !o)} aria-expanded={layerOpen}>
          <img src={A.icLayerMap} alt="" />
          <span>레이어 설정</span>
          <img src={A.icUp18} alt="" className="chev" />
        </button>
        {layerOpen && (
          <div className="layer-panel__body">
            <label className="search">
              <img src={A.icSearch} alt="" />
              <input placeholder="레이어 검색..." value={layerQuery} onChange={(e) => setLayerQuery(e.target.value)} />
            </label>
            {filteredBase.length > 0 && (
              <div className="layer-group">
                <p>기본 레이어</p>
                {filteredBase.map((l) => (
                  <button key={l} onClick={() => toggleLayer(l)} aria-pressed={layers.has(l)}>
                    <Checkbox checked={layers.has(l)} />
                    {l}
                  </button>
                ))}
              </div>
            )}
            {filteredSection.length > 0 && (
              <div className="layer-group">
                <p>구간 정보</p>
                {filteredSection.map((l) => (
                  <button key={l} onClick={() => toggleLayer(l)} aria-pressed={layers.has(l)}>
                    <Checkbox checked={layers.has(l)} />
                    {l}
                  </button>
                ))}
              </div>
            )}
            {filteredBase.length + filteredSection.length === 0 && <p className="layer-empty">‘{layerQuery}’ 레이어가 없습니다.</p>}
            <div className="layer-group">
              <p>제설 작업</p>
              {MODES.map((m) => (
                <button key={m.key} onClick={() => changeMode(m.key)} aria-pressed={mode === m.key}>
                  <Radio checked={mode === m.key} />
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {island ? (
        <div className="breadcrumb" style={{ left: visibleCenter.x }}>
          <img src={A.icPin} alt="" />
          <span>제주특별자치도</span>
          <img src={A.icChevronRight} alt="" />
          <span>{region.city}</span>
          <img src={A.icChevronRight} alt="" />
          <b>{region.name}</b>
        </div>
      ) : (
        <div className="route-head" style={{ left: visibleCenter.x }}>
          <b>1100도로 상세</b>
          <span>{mode === 'count' ? '구간별 제설 작업 횟수' : '노면 센서 기준 구간별 노면 상태'}</span>
          <button onClick={() => changeMode('status')}>전체 노선 보기</button>
        </div>
      )}

      <div className="map-tools">
        {island && (
          <div className="map-tools__base">
            <button className={`thumb${basemap === 'normal' ? ' on' : ''}`} onClick={() => setBasemap('normal')}>
              <img src={A.thumbMap} alt="" />
              <span>일반지도</span>
            </button>
            <button className={`thumb${basemap === 'satellite' ? ' on' : ''}`} onClick={() => { setBasemap('satellite'); setToast('목업에서는 위성지도를 음영 처리로 대신 표시합니다.') }}>
              <img src={A.thumbSatellite} alt="" />
              <span>위성지도</span>
            </button>
          </div>
        )}
        <div className="map-tools__group">
          <ToolButton icon={A.icZoomIn} tip="확대" onClick={() => zoom(0.2)} />
          <ToolButton icon={A.icZoomOut} tip="축소" onClick={() => zoom(-0.2)} />
        </div>
        <div className="map-tools__group">
          <ToolButton icon={A.icDistance} tip="거리재기" on={tool === 'distance'} onClick={() => startTool('distance')} />
          <ToolButton icon={A.icArea} tip="면적재기" on={tool === 'area'} onClick={() => startTool('area')} />
        </div>
      </div>

      {/* 구간 정보 말풍선 (UC-GIS-009 기본 흐름 3) */}
      {island && seg && tab === 'dashboard' && (
        <div className="seg-pop" style={{ left: segScreen.x, top: segScreen.y }}>
          <span className="seg-pop__icon">
            <img src={A.icObserve} alt="" />
          </span>
          <dl>
            <dt>구간</dt>
            <dd><b>{segName(seg)}</b></dd>
            <dt>제설 상태</dt>
            <dd><b style={{ color: STATE_COLOR[seg.state] }}>{seg.state}</b></dd>
            <dt>재결빙 위험</dt>
            <dd><b style={{ color: RISK_COLOR[seg.risk] }}>{seg.risk}</b>{seg.refreeze && <em className="seg-pop__warn">재결빙 경고</em>}</dd>
          </dl>
          <button className="seg-pop__close" onClick={() => setSegCode(null)} aria-label="닫기">×</button>
          {seg.road === '1100도로' && (
            <div className="seg-pop__links">
              <button onClick={() => changeMode('count')}>작업 횟수 보기</button>
              <button onClick={() => changeMode('surface')}>노면 상태 보기</button>
            </div>
          )}
        </div>
      )}

      {island && labelScreen && tab === 'vehicles' && (
        <span className="veh-label" style={{ left: labelScreen.x + 18 * view.z, top: labelScreen.y - 11 }}>
          {selectedVehicle.type} ({selectedVehicle.name})
        </span>
      )}
      {island && selectedVehicle && tab === 'vehicles' && <VehiclePopup key={selected} vehicle={selectedVehicle} onClose={() => setSelected(null)} />}

      <div className={`legend${legendOpen ? '' : ' closed'}`}>
        <button className="legend__head" onClick={() => setLegendOpen((o) => !o)} aria-expanded={legendOpen}>
          <b>범례</b>
          <img src={A.icChevronUp} alt="" />
        </button>
        {legendOpen && (
          <div className="legend__body">
            <p>{legend.title}</p>
            {legend.items.map(([c, l]) => (
              <span key={l}>
                {c ? <i style={{ background: c }} /> : <img src={A.icLegendRefreeze} alt="" />}
                {l}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── 우측 패널 ─────────────────────────────── */}
      <aside className="side-panel">
        <button className="side-panel__fold" onClick={() => setPanelOpen((o) => !o)} aria-label={panelOpen ? '패널 접기' : '패널 펼치기'}>
          <img src={panelOpen ? A.icPanelLeft : A.icPanelRight} alt="" />
        </button>
        <div className="side-panel__inner">
          <div className="tabs-line" role="tablist">
            <button role="tab" aria-selected={tab === 'dashboard'} className={tab === 'dashboard' ? 'on' : ''} onClick={() => setTab('dashboard')}>
              <span>대시보드</span>
              <i />
            </button>
            <button role="tab" aria-selected={tab === 'vehicles'} className={tab === 'vehicles' ? 'on' : ''} onClick={() => setTab('vehicles')}>
              <span>제설 차량 현황</span>
              <i />
            </button>
          </div>
          {tab === 'dashboard' ? (
            <DashboardPanel
              region={region.name}
              onShowSegment={(code) => {
                const s = SEGMENTS.find((x) => x.code === code)
                setMode('status')
                setSegCode(code)
                centerOn(s, 1.3)
              }}
            />
          ) : (
            <VehiclePanel selected={selected} onSelect={selectVehicle} />
          )}
        </div>
      </aside>
    </div>
  )
}

function ToolButton({ icon, tip, onClick, on }) {
  return (
    <button className={`tool${on ? ' on' : ''}`} onClick={onClick} aria-label={tip} aria-pressed={on}>
      <img src={icon} alt="" />
      <span className="tool__tip">
        {tip}
        <img src={A.icTooltipTip} alt="" />
      </span>
    </button>
  )
}

function ZoomVehicle({ src, x, y, w, h, rot }) {
  return <img className="map__abs" src={src} alt="" style={{ left: x - w / 2, top: y - h / 2, width: w, height: h, transform: `rotate(${rot}deg)` }} />
}
