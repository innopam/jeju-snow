import { useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { A, VEHICLE_ICONS, TRAIL_ICONS } from '../assets.js'
import { Checkbox, Radio } from '../components/Controls.jsx'
import { CCTV, MAP_VEHICLES, SEGMENTS, TRAILS, VEHICLES, WEATHER } from '../data/dashboard.js'
import DashboardPanel from './dashboard/DashboardPanel.jsx'
import VehiclePanel from './dashboard/VehiclePanel.jsx'
import VehiclePopup from './dashboard/VehiclePopup.jsx'
import './dashboard.css'

const BASE_LAYERS = ['기상정보', '연속지적도', '적설 감시 CCTV']
const SECTION_LAYERS = ['주요 교통량 축', '제설 우선노선', '상습 결빙/파손 구간', '재결빙 위험 구간', '블랙아이스 및 위험구간']
const MODES = [
  { key: 'status', label: '제설 작업 상태' },
  { key: 'count', label: '제설 작업 횟수' },
  { key: 'surface', label: '노면 상태' },
]

const LEGENDS = {
  status: {
    title: '구간',
    items: [['#f93c65', '미작업'], ['#ff8a3d', '제설 필요'], ['#fcbe2d', '진행'], ['#00b69b', '완료'], [null, '재결빙 주의']],
  },
  count: {
    title: '제설 횟수',
    items: [['#334155', '미작업'], ['#2563eb', '1회'], ['#f97316', '2회'], ['#0d9488', '3회'], ['#7e22ce', '4회']],
  },
  surface: {
    title: '도로상태',
    items: [['#334155', '오류'], ['#22c55e', '건조'], ['#60a5fa', '습기'], ['#1d4ed8', '젖음'], ['#ec4899', '적설'], ['#ef4444', '아이스'], ['#f97316', '슬러시']],
  },
}

// 노면 상태 레이어의 1100도로 제설 횟수 라벨 (UI-001-03)
const COUNT_LABELS = [
  [620, 110, 2], [632, 221, 3], [635, 350, 4], [573, 432, 3], [559, 579, 2], [547, 667, 1], [508, 803, 1],
].map(([x, y, n]) => ({ x: 17 + x, y: 17 + y, n }))
const COUNT_COLORS = { 1: '#2563eb', 2: '#f97316', 3: '#0d9488', 4: '#7e22ce' }

export default function Dashboard() {
  const { setToast } = useOutletContext()
  const [layers, setLayers] = useState(() => new Set(['기상정보', '연속지적도', '적설 감시 CCTV', '주요 교통량 축', '제설 우선노선', '재결빙 위험 구간']))
  const [layerOpen, setLayerOpen] = useState(true)
  const [layerQuery, setLayerQuery] = useState('')
  const [mode, setMode] = useState('status')
  const [tab, setTab] = useState('dashboard')
  const [panelOpen, setPanelOpen] = useState(true)
  const [legendOpen, setLegendOpen] = useState(true)
    const [selected, setSelected] = useState(null) // VEHICLES index
  const [view, setView] = useState({ x: 0, y: 0, z: 1 })
  const drag = useRef(null)

  const toggleLayer = (name) =>
    setLayers((s) => {
      const n = new Set(s)
      if (n.has(name)) n.delete(name)
      else n.add(name)
      return n
    })

  const zoom = (d) => setView((v) => ({ ...v, z: Math.min(2, Math.max(0.6, +(v.z + d).toFixed(2))) }))
  const onPointerDown = (e) => {
    if (e.button !== 0 || e.target.closest('button')) return
    drag.current = { sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (!drag.current) return
    const d = drag.current
    setView((v) => ({ ...v, x: d.ox + e.clientX - d.sx, y: d.oy + e.clientY - d.sy }))
  }
  const onPointerUp = () => (drag.current = null)

  const selectedVehicle = selected != null ? VEHICLES[selected] : null
  const selectedMap = selectedVehicle?.mapId ? MAP_VEHICLES.find((m) => m.id === selectedVehicle.mapId) : null
  const selectMapVehicle = (mapId) => {
    const idx = VEHICLES.findIndex((v) => v.mapId === mapId)
    if (idx < 0) return setToast('목록에 없는 차량입니다 (목업).')
    setTab('vehicles')
    setPanelOpen(true)
    setSelected(idx)
  }

  const island = mode === 'status'
  const filteredBase = BASE_LAYERS.filter((l) => l.includes(layerQuery))
  const filteredSection = SECTION_LAYERS.filter((l) => l.includes(layerQuery))
  const seg = SEGMENTS['K-12']
  const legend = LEGENDS[mode]

  return (
    <div className={`dash${panelOpen ? '' : ' panel-closed'}`}>
      {/* ── 지도 ─────────────────────────────────── */}
      <div
        className="map"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="map__world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})` }}>
          {island ? (
            <>
              <img className="map__base map__base--island" src={A.mapIsland} alt="제주도 지도" draggable={false} />
              {tab === 'vehicles' &&
                TRAILS.map((t) => (
                  <img key={t.id} className="map__abs" src={TRAIL_ICONS[t.id]} alt="" style={{ left: t.x, top: t.y, width: t.w, height: t.h }} />
                ))}
              {layers.has('적설 감시 CCTV') &&
                CCTV.map((c) => (
                  <button key={c.id} className="cctv" style={{ left: c.x, top: c.y }} onClick={() => setToast(`CCTV #${c.id} 영상 연결 (목업)`)} title={`적설 감시 CCTV #${c.id}`}>
                    <img src={A.icCctv} alt="" />
                  </button>
                ))}
              {selectedMap && <span className="veh-ring" style={{ left: selectedMap.x, top: selectedMap.y }} />}
              {MAP_VEHICLES.map((m) => (
                <button
                  key={m.id}
                  className="veh"
                  style={{ left: m.x, top: m.y, transform: `translate(-50%, -50%) rotate(${m.rot}deg)` }}
                  onClick={() => selectMapVehicle(m.id)}
                  title={`${m.id}호 · ${m.type} · ${m.road}`}
                >
                  <img src={VEHICLE_ICONS[m.id]} alt="" draggable={false} />
                </button>
              ))}
              {selectedMap && (
                <span className="veh-label" style={{ left: selectedMap.x + 15, top: selectedMap.y - 11 }}>
                  {selectedVehicle.type} ({selectedVehicle.name})
                </span>
              )}
              {layers.has('기상정보') &&
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
                    <span key={i} className="count-label" style={{ left: l.x, top: l.y, color: COUNT_COLORS[l.n], borderColor: COUNT_COLORS[l.n] }}>
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
      </div>

      {/* ── 지도 위 고정 UI ───────────────────────── */}
      <section className={`layer-panel${layerOpen ? '' : ' closed'}`}>
        <button className="layer-panel__title" onClick={() => setLayerOpen((o) => !o)}>
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
                  <button key={l} onClick={() => toggleLayer(l)}>
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
                  <button key={l} onClick={() => toggleLayer(l)}>
                    <Checkbox checked={layers.has(l)} />
                    {l}
                  </button>
                ))}
              </div>
            )}
            <div className="layer-group">
              <p>제설 작업</p>
              {MODES.map((m) => (
                <button key={m.key} onClick={() => setMode(m.key)}>
                  <Radio checked={mode === m.key} />
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {island && (
        <div className="breadcrumb">
          <img src={A.icPin} alt="" />
          <span>제주특별자치도</span>
          <img src={A.icChevronRight} alt="" />
          <span>서귀포시</span>
          <img src={A.icChevronRight} alt="" />
          <b>대정읍</b>
        </div>
      )}

      {island && (
        <div className="map-tools">
          <div className="map-tools__base">
            <button className="thumb on">
              <img src={A.thumbMap} alt="" />
              <span>일반지도</span>
            </button>
            <button className="thumb" onClick={() => setToast('위성지도는 목업에서 제공되지 않습니다.')}>
              <img src={A.thumbSatellite} alt="" />
              <span>위성지도</span>
            </button>
          </div>
          <div className="map-tools__group">
            <ToolButton icon={A.icZoomIn} tip="확대" onClick={() => zoom(0.2)} />
            <ToolButton icon={A.icZoomOut} tip="축소" onClick={() => zoom(-0.2)} />
          </div>
          <div className="map-tools__group">
            <ToolButton icon={A.icDistance} tip="거리재기" onClick={() => setToast('지도에서 시작점을 클릭하세요 (목업)')} />
            <ToolButton icon={A.icArea} tip="면적재기" onClick={() => setToast('지도에서 영역을 그리세요 (목업)')} />
          </div>
        </div>
      )}

      {island && seg && tab === 'dashboard' && (
        <div className="seg-pop" style={{ left: seg.x + view.x, top: seg.y + view.y }}>
          <span className="seg-pop__icon">
            <img src={A.icObserve} alt="" />
          </span>
          <dl>
            <dt>구간</dt>
            <dd><b>{seg.name}</b></dd>
            <dt>제설 상태</dt>
            <dd><b style={{ color: seg.stateColor }}>{seg.state}</b></dd>
            <dt>재결빙 위험</dt>
            <dd><b style={{ color: seg.riskColor }}>{seg.risk}</b></dd>
          </dl>
        </div>
      )}

      {island && selectedVehicle && tab === 'vehicles' && <VehiclePopup key={selected} vehicle={selectedVehicle} onClose={() => setSelected(null)} />}

      <div className={`legend${legendOpen ? '' : ' closed'}`}>
        <button className="legend__head" onClick={() => setLegendOpen((o) => !o)}>
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
        <button className="side-panel__fold" onClick={() => setPanelOpen((o) => !o)} aria-label="패널 접기">
          <img src={panelOpen ? A.icPanelLeft : A.icPanelRight} alt="" />
        </button>
        <div className="side-panel__inner">
          <div className="tabs-line">
            <button className={tab === 'dashboard' ? 'on' : ''} onClick={() => setTab('dashboard')}>
              <span>대시보드</span>
              <i />
            </button>
            <button className={tab === 'vehicles' ? 'on' : ''} onClick={() => setTab('vehicles')}>
              <span>제설 차량 현황</span>
              <i />
            </button>
          </div>
          {tab === 'dashboard' ? (
            <DashboardPanel onShowSegment={() => { setMode('status'); setView({ x: 0, y: 0, z: 1 }) }} />
          ) : (
            <VehiclePanel selected={selected} onSelect={setSelected} />
          )}
        </div>
      </aside>
    </div>
  )
}

function ToolButton({ icon, tip, onClick }) {
  return (
    <button className="tool" onClick={onClick} aria-label={tip}>
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
