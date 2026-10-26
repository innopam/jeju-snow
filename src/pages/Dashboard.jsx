import { useEffect, useRef, useState } from 'react'
import { useLocation, useOutletContext } from 'react-router-dom'
import Feature from 'ol/Feature.js'
import LineString from 'ol/geom/LineString.js'
import Draw from 'ol/interaction/Draw.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorSource from 'ol/source/Vector.js'
import { getArea, getLength } from 'ol/sphere.js'
import { boundingExtent } from 'ol/extent.js'
import { Stroke, Style, Fill, Circle as CircleStyle } from 'ol/style.js'
import { A, VEHICLE_ICONS } from '../assets.js'
import { Checkbox, Radio } from '../components/Controls.jsx'
import { VEHICLES } from '../data/dashboard.js'
import {
  CCTV_GEO, COUNT_COLORS, JEJU_CENTER, ROUTES, SEGMENTS_GEO, SURFACE_COLORS,
  VEHICLES_GEO, WEATHER_GEO, nearestRegionGeo, vehicleTrack,
} from '../data/geo.js'
import { RISK_COLOR, SEGMENTS, STATE_COLOR, segName } from '../data/segments.js'
import { HAS_VWORLD, createBaseLayers, createCadastralLayer } from '../map/basemap.js'
import { fromLonLat, toLonLat, useOlMap } from '../map/useOlMap.js'
import DashboardPanel from './dashboard/DashboardPanel.jsx'
import VehiclePanel from './dashboard/VehiclePanel.jsx'
import VehiclePopup from './dashboard/VehiclePopup.jsx'
import { BP, useMedia } from '../useMedia.js'
import './dashboard.css'

// UI-SIRS-001-01 ~ 04 통합 관제 대시보드 — OpenLayers + K-Geo플랫폼(브이월드) 배경지도
const BASE_LAYERS = ['기상정보', '연속지적도', '적설 감시 CCTV']
const SECTION_LAYERS = ['주요 교통량 축', '제설 우선노선', '상습 결빙/파손 구간', '재결빙 위험 구간', '블랙아이스 및 위험구간']
const MODES = [
  { key: 'status', label: '제설 작업 상태' },
  { key: 'count', label: '제설 작업 횟수' },
  { key: 'surface', label: '노면 상태' },
]
const LEGENDS = {
  status: { title: '구간', items: [['#f93c65', '미작업'], ['#ff8a3d', '제설 필요'], ['#fcbe2d', '진행'], ['#00b69b', '완료'], [null, '재결빙 주의']] },
  count: { title: '제설 횟수', items: [0, 1, 2, 3, 4].map((n) => [COUNT_COLORS[n], n ? `${n}회` : '미작업']) },
  surface: { title: '도로상태', items: Object.entries(SURFACE_COLORS).map(([k, c]) => [c, k]) },
}
const STATE_LINE = { 미작업: '#f93c65', '제설 필요': '#ff8a3d', 진행중: '#fcbe2d', 완료: '#00b69b' }
const PANEL_DESKTOP = 380
const mq = (q) => typeof window !== 'undefined' && window.matchMedia(q).matches
const segGeo = (s) => SEGMENTS_GEO[s.code]

export default function Dashboard() {
  const { setToast } = useOutletContext()
  const location = useLocation()
  const [layers, setLayers] = useState(() => new Set(['기상정보', '연속지적도', '적설 감시 CCTV', '주요 교통량 축', '제설 우선노선', '재결빙 위험 구간']))
  const isMobile = useMedia(BP.mobile)
  const PANEL_W = isMobile ? 0 : PANEL_DESKTOP // 모바일은 하단 시트라 지도 가로를 가리지 않는다
  const [layerOpen, setLayerOpen] = useState(() => !mq(BP.mobile))
  const [layerQuery, setLayerQuery] = useState('')
  const [mode, setMode] = useState('status')
  const [basemap, setBasemap] = useState('normal')
  const [tab, setTab] = useState('dashboard')
  const [panelOpen, setPanelOpen] = useState(() => !mq(BP.narrow))
  const [legendOpen, setLegendOpen] = useState(() => !mq(BP.mobile))
  const [segCode, setSegCode] = useState(() => (mq(BP.mobile) ? null : 'K-12'))
  const [selected, setSelected] = useState(null) // VEHICLES index
  const [tool, setTool] = useState(null) // 'distance' | 'area'
  const [measure, setMeasure] = useState(null) // { text, at }

  // 지도 상태를 스타일 함수에서 읽기 위한 ref
  const live = useRef({ mode, selectedMapId: null, tab })
  const selectedVehicle = selected != null ? VEHICLES[selected] : null
  const selectedMapId = selectedVehicle?.mapId ?? null
  live.current = { mode, selectedMapId, tab }

  const layerRefs = useRef({})
  const { elRef, mapRef, tick, pixelOf } = useOlMap({
    center: JEJU_CENTER,
    zoom: 10.3,
    layers: () => {
      const base = createBaseLayers()
      const cadastral = createCadastralLayer()
      const routes = new VectorLayer({ source: new VectorSource(), style: (f) => routeStyle(f, live.current), updateWhileAnimating: true, updateWhileInteracting: true })
      const trails = new VectorLayer({ source: new VectorSource(), style: (f) => trailStyle(f, live.current), visible: false })
      const measureLayer = new VectorLayer({
        source: new VectorSource(),
        style: new Style({ stroke: new Stroke({ color: '#37348f', width: 2.5, lineDash: [6, 4] }), fill: new Fill({ color: 'rgba(55,52,143,0.15)' }), image: new CircleStyle({ radius: 4, fill: new Fill({ color: '#fff' }), stroke: new Stroke({ color: '#37348f', width: 2 }) }) }),
      })
      // 노선 라인: 구간(edge)마다 feature 하나
      ROUTES.forEach((r) =>
        r.coords.slice(0, -1).forEach((a, i) => {
          const f = new Feature(new LineString([fromLonLat(a), fromLonLat(r.coords[i + 1])]))
          f.setProperties({ route: r.name, idx: i, state: r.states[i], count: r.counts[i], surface: r.surface[i] })
          routes.getSource().addFeature(f)
        }),
      )
      VEHICLES_GEO.forEach((v) => {
        const f = new Feature(new LineString(vehicleTrack(v).trail.map((c) => fromLonLat(c))))
        f.set('vehicle', v.id)
        trails.getSource().addFeature(f)
      })
      layerRefs.current = { base, cadastral, routes, trails, measureLayer }
      return [...base.normal, ...(base.satellite ?? []), ...(cadastral ? [cadastral] : []), routes, trails, measureLayer]
    },
  })

  // 레이어 표시 상태 동기화
  useEffect(() => {
    const { base, cadastral, routes, trails } = layerRefs.current
    base.normal.forEach((l) => l.setVisible(basemap === 'normal' || !base.satellite))
    base.satellite?.forEach((l) => l.setVisible(basemap === 'satellite'))
    cadastral?.setVisible(layers.has('연속지적도'))
    trails.setVisible(tab === 'vehicles')
    routes.changed()
    trails.changed()
  }, [basemap, layers, tab, mode, selectedMapId])

  // 지도 가운데(우측 패널 제외) 좌표 → 행정구역 경로
  const size = mapRef.current?.getSize() ?? [1246, 919]
  const visibleCenterPx = [(size[0] - (panelOpen ? PANEL_W : 0)) / 2, size[1] / 2]
  const centerCoord = mapRef.current?.getCoordinateFromPixel(visibleCenterPx)
  const region = nearestRegionGeo(centerCoord ? toLonLat(centerCoord) : JEJU_CENTER)

  const flyTo = (lonlat, zoom = 12.5) => {
    const view = mapRef.current?.getView()
    if (!view) return
    const res = view.getResolutionForZoom(zoom)
    const c = fromLonLat(lonlat)
    view.animate({ center: [c[0] + (panelOpen ? (PANEL_W / 2) * res : 0), c[1]], zoom, duration: 450 })
  }
  const fitTo = (coords, duration = 450) => {
    mapRef.current?.getView().fit(boundingExtent(coords.map((c) => fromLonLat(c))), { padding: isMobile ? [70, 44, 70, 44] : [60, panelOpen ? PANEL_W + 60 : 80, 40, layerOpen ? 245 : 60], duration, maxZoom: 13 })
  }
  // 제주 전역 보기 — 처음 열 때와 '제설 작업 상태'로 돌아올 때
  const fitIsland = (duration) => fitTo([...ROUTES.flatMap((r) => r.coords), ...WEATHER_GEO.map((w) => w.at)], duration)
  useEffect(() => {
    // 레이아웃이 확정된 뒤 지도 크기를 다시 재고 맞춘다
    const t = setTimeout(() => {
      mapRef.current?.updateSize()
      fitIsland(0)
    }, 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile])

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
    setTimeout(() => flyTo(segGeo(s), 12.5), 60)
    setToast(`${segName(s)} 구간으로 이동했습니다.`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce])

  const toggleLayer = (name) => {
    if (name === '연속지적도' && !HAS_VWORLD && !layers.has(name)) setToast('연속지적도는 브이월드 인증키를 설정하면 표출됩니다.')
    setLayers((s) => {
      const n = new Set(s)
      if (n.has(name)) n.delete(name)
      else n.add(name)
      return n
    })
  }

  // 제설 작업 레이어(택1) — 선택에 따라 전체 노선의 색상·범례를 제설 작업 상태 / 작업 횟수 / 노면 상태로 바꾼다
  const changeMode = (m) => setMode(m)
  const zoom = (d) => {
    const v = mapRef.current?.getView()
    v?.animate({ zoom: v.getZoom() + d, duration: 250 })
  }

  // 거리·면적 재기 — ol/sphere 로 실제 측지 거리·면적 계산
  const drawRef = useRef(null)
  const stopMeasure = () => {
    if (drawRef.current) mapRef.current?.removeInteraction(drawRef.current)
    drawRef.current = null
    layerRefs.current.measureLayer?.getSource().clear()
    setTool(null)
    setMeasure(null)
  }
  const startTool = (t) => {
    const map = mapRef.current
    const was = tool
    stopMeasure()
    if (was === t) return
    const draw = new Draw({ source: layerRefs.current.measureLayer.getSource(), type: t === 'distance' ? 'LineString' : 'Polygon' })
    draw.on('drawstart', () => { layerRefs.current.measureLayer.getSource().clear(); setMeasure(null) })
    draw.on('drawend', (e) => {
      const g = e.feature.getGeometry()
      const text = t === 'distance' ? fmtLength(getLength(g)) : fmtArea(getArea(g))
      const at = toLonLat(t === 'distance' ? g.getLastCoordinate() : g.getInteriorPoint().getCoordinates())
      setMeasure({ text: `${t === 'distance' ? '총 거리' : '면적'} ${text}`, at })
    })
    map.addInteraction(draw)
    drawRef.current = draw
    setTool(t)
    setToast(t === 'distance' ? '지도를 클릭해 지점을 찍고, 더블클릭으로 끝내세요. (Esc: 종료)' : '지도를 클릭해 영역을 그리고, 더블클릭으로 끝내세요. (Esc: 종료)')
  }
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && stopMeasure()
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // UC-GIS-005: 차량 선택 시 위치·궤적 표출
  const selectVehicle = (idx) => {
    setSelected(idx)
    const g = VEHICLES_GEO.find((x) => x.id === VEHICLES[idx]?.mapId)
    if (g && mode === 'status') flyTo(g.at, Math.max(mapRef.current?.getView().getZoom() ?? 11, 11.5))
  }
  const selectMapVehicle = (mapId) => {
    const idx = VEHICLES.findIndex((v) => v.mapId === mapId)
    if (idx < 0) return setToast(`${mapId}호 차량은 단말 미등록 차량입니다 (목업).`)
    setTab('vehicles')
    if (!isMobile) setPanelOpen(true)
    selectVehicle(idx)
  }

  const island = true // 모든 제설 작업 레이어가 전체 노선 지도 위에서 동작
  const showEdgeLabels = mode !== 'status' && zoomLevelOf(mapRef) >= 11 // 확대 시 구간별 횟수·노면 상태 라벨
  const showLayer = (l) => layers.has(l)
  const filteredBase = BASE_LAYERS.filter((l) => l.includes(layerQuery.trim()))
  const filteredSection = SECTION_LAYERS.filter((l) => l.includes(layerQuery.trim()))
  const legend = LEGENDS[mode]
  const seg = SEGMENTS.find((s) => s.code === segCode)
  const vehiclesShown = VEHICLES_GEO
  const zoomLevel = mapRef.current?.getView().getZoom() ?? 10.3
  void tick // 지도 이동 시 다시 그리기

  const px = (lonlat) => pixelOf(lonlat) ?? [-999, -999]
  const segPx = seg && px(segGeo(seg))
  const selGeo = VEHICLES_GEO.find((v) => v.id === selectedMapId)
  const selPx = selGeo && px(selGeo.at)
  const routeMid = (r) => r.coords[Math.floor(r.coords.length / 2)]

  return (
    <div className={`dash${panelOpen ? '' : ' panel-closed'}${tool ? ' measuring' : ''}`}>
      {/* ── 지도 (OpenLayers) ───────────────────────── */}
      <div ref={elRef} className={`olmap${basemap === 'satellite' && !HAS_VWORLD ? ' satellite-sim' : ''}`} />
      <div className="map-overlays">
        {island && showLayer('제설 우선노선') &&
          ROUTES.filter((r) => r.priority).map((r) => { const p = px(routeMid(r)); return <span key={`p-${r.name}`} className="route-tag priority" style={{ left: p[0], top: p[1] - 14 }}>우선 · {r.name}</span> })}
        {island && showLayer('주요 교통량 축') &&
          ROUTES.filter((r) => r.traffic).map((r) => { const p = px(r.coords[1]); return <span key={`t-${r.name}`} className="route-tag traffic" style={{ left: p[0], top: p[1] + 14 }}>교통량 축</span> })}
        {island && showLayer('적설 감시 CCTV') &&
          CCTV_GEO.map((c) => { const p = px(c.at); return (
            <button key={c.id} className="cctv" style={{ left: p[0] - 12, top: p[1] - 12 }} onClick={() => setToast(`적설 감시 CCTV #${c.id} 영상 연결 (목업)`)} title={`적설 감시 CCTV #${c.id}`}>
              <img src={A.icCctv} alt="" />
            </button>
          ) })}
        {SEGMENTS.map((s) => {
          const p = px(segGeo(s))
          return (
            <button
              key={s.code}
              className={`seg-dot${segCode === s.code && tab === 'dashboard' ? ' on' : ''}`}
              style={{ left: p[0], top: p[1], '--c': STATE_COLOR[s.state] }}
              onClick={() => { setSegCode(s.code); setTab('dashboard') }}
              title={`${segName(s)} · ${s.state}`}
              aria-label={segName(s)}
            >
              {showLayer('재결빙 위험 구간') && s.refreeze && <i className="mk refreeze" />}
              {showLayer('블랙아이스 및 위험구간') && s.blackice && <em className="mk-tag ice">블랙아이스</em>}
              {showLayer('상습 결빙/파손 구간') && s.habitual && <em className="mk-tag habitual">상습</em>}
            </button>
          )
        })}
        {showEdgeLabels && ROUTES.flatMap((r) => r.coords.slice(0, -1).map((a, i) => {
          const b = r.coords[i + 1]
          const p = px([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2])
          const n = r.counts[i]
          const sf = r.surface[i]
          const color = mode === 'count' ? COUNT_COLORS[n] : SURFACE_COLORS[sf]
          return (
            <span key={`${r.name}-${i}`} className="count-label" style={{ left: p[0] + 10, top: p[1] - 9, color, borderColor: color }} title={`${r.name} ${i + 1}구간 · 제설 ${n}회 · 노면 ${sf}`}>
              {mode === 'count' ? (n ? `${n}회` : '미작업') : sf}
            </span>
          )
        }))}
        {selPx && tab === 'vehicles' && island && <span className="veh-ring" style={{ left: selPx[0], top: selPx[1] }} />}
        {vehiclesShown.map((v) => {
          const t = vehicleTrack(v)
          const p = px(v.at)
          const a = px(t.from)
          const b = px(t.to)
          const rot = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI
          const scale = Math.min(1.4, Math.max(0.75, 0.75 + (zoomLevel - 10) * 0.12))
          return (
            <button key={v.id} className="veh" style={{ left: p[0], top: p[1], transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${scale})` }} onClick={() => selectMapVehicle(v.id)} title={`${v.id}호 · ${v.type} · ${v.road}`}>
              <img src={VEHICLE_ICONS[v.id]} alt="" draggable={false} />
            </button>
          )
        })}
        {selPx && tab === 'vehicles' && island && (
          <span className="veh-label" style={{ left: selPx[0] + 20, top: selPx[1] - 11 }}>{selectedVehicle.type} ({selectedVehicle.name})</span>
        )}
        {island && showLayer('기상정보') &&
          WEATHER_GEO.map((w) => { const p = px(w.at); return (
            <span key={w.name} className="wx" style={{ left: p[0], top: p[1], transform: 'translate(-50%, -50%)' }}>
              <img src={w.icon} alt="" />
              <span>{w.name}</span>
              <b className={w.temp < 0 ? 'cold' : ''}>{w.temp.toFixed(1)}°</b>
            </span>
          ) })}
        {measure && (() => { const p = px(measure.at); return (
          <span className="measure-label" style={{ left: p[0] + 10, top: p[1] - 30 }}>
            {measure.text}
            <button onClick={stopMeasure} aria-label="측정 종료">×</button>
          </span>
        ) })()}
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
                    {l === '연속지적도' && <small className="layer-hint">{HAS_VWORLD ? '확대 시 표출' : '인증키 필요'}</small>}
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

      <div className="breadcrumb" style={{ left: visibleCenterPx[0] }}>
        <img src={A.icPin} alt="" />
        <span>제주특별자치도</span>
        <img src={A.icChevronRight} alt="" />
        <span>{region.city}</span>
        <img src={A.icChevronRight} alt="" />
        <b>{region.name}</b>
      </div>

      <div className="map-tools">
        <div className="map-tools__base">
          <button className={`thumb${basemap === 'normal' ? ' on' : ''}`} onClick={() => setBasemap('normal')}>
            <img src={A.thumbMap} alt="" />
            <span>일반지도</span>
          </button>
          <button className={`thumb${basemap === 'satellite' ? ' on' : ''}`} onClick={() => { setBasemap('satellite'); if (!HAS_VWORLD) setToast('위성지도는 브이월드 인증키 설정 후 제공됩니다. (임시: 음영 처리)') }}>
            <img src={A.thumbSatellite} alt="" />
            <span>위성지도</span>
          </button>
        </div>
        <div className="map-tools__group">
          <ToolButton icon={A.icZoomIn} tip="확대" onClick={() => zoom(1)} />
          <ToolButton icon={A.icZoomOut} tip="축소" onClick={() => zoom(-1)} />
        </div>
        <div className="map-tools__group">
          <ToolButton icon={A.icDistance} tip="거리재기" on={tool === 'distance'} onClick={() => startTool('distance')} />
          <ToolButton icon={A.icArea} tip="면적재기" on={tool === 'area'} onClick={() => startTool('area')} />
        </div>
      </div>

      {/* 구간 정보 말풍선 (UC-GIS-009 기본 흐름 3) */}
      {seg && segPx && tab === 'dashboard' && (
        <div className="seg-pop" style={{ left: segPx[0], top: segPx[1] }}>
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
        </div>
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
        <button className="side-panel__fold" onClick={() => setPanelOpen((o) => !o)} aria-label={panelOpen ? '패널 접기' : '패널 펼치기'} aria-expanded={panelOpen}>
          <img src={panelOpen ? A.icPanelLeft : A.icPanelRight} alt="" />
          <span className="side-panel__fold-label">{panelOpen ? '현황 닫기' : tab === 'vehicles' ? '제설 차량 현황' : '종합 현황'}</span>
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
                if (isMobile) setPanelOpen(false)
                setMode('status')
                setSegCode(code)
                flyTo(segGeo(s), 12.5)
              }}
            />
          ) : (
            <VehiclePanel selected={selected} onSelect={(i) => { if (isMobile) setPanelOpen(false); selectVehicle(i) }} />
          )}
        </div>
      </aside>
    </div>
  )
}

// 노선 스타일 — 제설 작업 상태 / 작업 횟수 / 노면 상태
function routeStyle(f, { mode }) {
  if (mode === 'status') {
    return [
      new Style({ stroke: new Stroke({ color: 'rgba(255,255,255,0.9)', width: 8 }) }),
      new Style({ stroke: new Stroke({ color: STATE_LINE[f.get('state')], width: 5, lineCap: 'round' }) }),
    ]
  }
  const color = mode === 'count' ? COUNT_COLORS[f.get('count')] : SURFACE_COLORS[f.get('surface')]
  return [
    new Style({ stroke: new Stroke({ color: 'rgba(255,255,255,0.9)', width: 8 }) }),
    new Style({ stroke: new Stroke({ color, width: 5, lineCap: 'round' }) }),
  ]
}

// 차량 진행 궤적 — 선택 차량 강조 (UI-SIRS-001-04)
function trailStyle(f, { selectedMapId }) {
  const on = f.get('vehicle') === selectedMapId
  if (selectedMapId && !on) return new Style({ stroke: new Stroke({ color: 'rgba(55,65,81,0.25)', width: 3, lineDash: [4, 6] }) })
  return new Style({ stroke: new Stroke({ color: on ? '#37348f' : 'rgba(55,65,81,0.75)', width: on ? 5 : 3.5, lineDash: on ? undefined : [6, 6], lineCap: 'round' }) })
}

const zoomLevelOf = (mapRef) => mapRef.current?.getView().getZoom() ?? 10
const fmtLength = (m) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`)
const fmtArea = (m2) => (m2 >= 1e6 ? `${(m2 / 1e6).toFixed(2)} km²` : `${Math.round(m2).toLocaleString()} m²`)

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
