import { useEffect, useRef, useState } from 'react'
import { A } from '../../assets.js'
import { VEHICLE_STATUS } from '../../data/dashboard.js'

const fmt = (d) =>
  `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${d.toTimeString().slice(0, 8)}`

// 차량 상세 팝업 · 전방 카메라 (UI-001-04)
export default function VehiclePopup({ vehicle, onClose }) {
  const [now, setNow] = useState(() => new Date())
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const st = VEHICLE_STATUS[vehicle.status]
  const live = vehicle.status !== 'done'

  // 머리글을 끌어 팝업 위치 이동 — 지도 영역 밖으로는 나가지 않게 제한
  const ref = useRef(null)
  const drag = useRef(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const onPointerDown = (e) => {
    if (e.button !== 0 || e.target.closest('button')) return
    const el = ref.current
    const box = el.getBoundingClientRect()
    const area = el.offsetParent.getBoundingClientRect()
    drag.current = {
      sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y,
      minX: offset.x - (box.left - area.left), maxX: offset.x + (area.right - box.right),
      minY: offset.y - (box.top - area.top), maxY: offset.y + (area.bottom - box.bottom),
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d) return
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
    setOffset({ x: clamp(d.ox + e.clientX - d.sx, d.minX, d.maxX), y: clamp(d.oy + e.clientY - d.sy, d.minY, d.maxY) })
  }
  const onPointerUp = () => (drag.current = null)

  return (
    <div className="vpop" ref={ref} style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}>
      <div
        className="vpop__head"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={(e) => !e.target.closest('button') && setOffset({ x: 0, y: 0 })}
        title="끌어서 이동 · 더블클릭하면 원래 위치"
      >
        <span className="vrow__type">{vehicle.type}</span>
        <b>{vehicle.name}</b>
        <span className="vrow__st" style={{ background: st.bg, color: st.fg }}>
          <img src={st.dot} alt="" />
          {st.label}
        </span>
        <span style={{ flex: 1 }} />
        <button onClick={onClose} aria-label="닫기">
          <img src={A.icClose} alt="" />
        </button>
      </div>
      <div className={`vpop__video${playing ? ' playing' : ''}`}>
        <img className="vpop__road" src={A.videoRoad} alt="" />
        {live && (
          <span className="vpop__live">
            <img src={A.videoLiveDot} alt="" />
            LIVE
          </span>
        )}
        <span className="vpop__time">{fmt(now)}</span>
        {live && !playing && (
          <button className="vpop__play" onClick={() => setPlaying(true)} aria-label="재생">
            <img src={A.videoPlay} alt="" />
          </button>
        )}
        <span className="vpop__cap">전방 카메라 · {live ? '실시간' : '종료됨'}</span>
      </div>
    </div>
  )
}
