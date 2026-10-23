import { useEffect, useState } from 'react'
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

  return (
    <div className="vpop">
      <div className="vpop__head">
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
