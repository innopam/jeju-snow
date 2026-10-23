import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { A } from '../assets.js'
import { PAGE_TITLES } from '../data/routes.js'
import { ALERTS, ALERT_TYPES } from '../data/alerts.js'
import { Toast } from './Controls.jsx'
import './layout.css'

const MENU = [
  { to: '/', label: '통합 관제 대시보드', icon: A.icMenuDashboard },
  { to: '/stats', label: '통계', icon: A.icMenuChart },
  { to: '/fusion', label: '제설 및 기상 융합 분석', icon: A.icMenuFusion },
]

export default function Layout() {
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [alerts, setAlerts] = useState(ALERTS)
  const [toast, setToast] = useState('')
  const title = PAGE_TITLES[pathname] ?? PAGE_TITLES['/']
  const unread = alerts.filter((a) => a.unread).length

  return (
    <div className="app">
      <aside className={`lnb${collapsed ? ' collapsed' : ''}`}>
        <div className="lnb__brand">
          <img src={A.logo} alt="Jeju" />
          <p>제설·결빙 대응 시스템</p>
        </div>
        <button className="lnb__collapse" onClick={() => setCollapsed((c) => !c)} aria-label="메뉴 접기">
          <img src={A.icCollapse} alt="" />
        </button>
        <nav className="lnb__menu">
          {MENU.map((m) => (
            <NavLink key={m.to} to={m.to} end className={({ isActive }) => `lnb__item${isActive ? ' active' : ''}`} title={m.label}>
              <img src={m.icon} alt="" />
              <span className="lnb__label">{m.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="lnb__bottom">
          <NavLink to="/monitoring" className={({ isActive }) => `lnb__sub${isActive ? ' active' : ''}`} title="데이터 연계 모니터링">
            <img src={A.icMonitor} alt="" />
            <span className="lnb__label">데이터 연계 모니터링</span>
          </NavLink>
          <button className="lnb__sub" onClick={() => setToast('목업 화면입니다 — 설정 기능은 준비 중입니다.')} title="설정">
            <img src={A.icSettings} alt="" />
            <span className="lnb__label">설정</span>
          </button>
          <button className="lnb__sub" onClick={() => setToast('목업 화면입니다 — 로그아웃되지 않습니다.')} title="로그아웃">
            <img src={A.icLogout} alt="" />
            <span className="lnb__label">로그아웃</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <h1>{title}</h1>
          <div className="topbar__right">
            <button className="bell" onClick={() => setAlertOpen((o) => !o)} aria-label="위험 이벤트 알림">
              <img src={A.icBell} alt="" />
              {unread > 0 && <span className="bell__count">{unread}</span>}
            </button>
            <p className="topbar__user">도로관리과 홍길동 님</p>
          </div>
          {alertOpen && (
            <AlertDropdown
              alerts={alerts}
              onClose={() => setAlertOpen(false)}
              onReadAll={() => setAlerts((list) => list.map((a) => ({ ...a, unread: false })))}
              onRead={(id) => setAlerts((list) => list.map((a) => (a.id === id ? { ...a, unread: false } : a)))}
            />
          )}
        </header>
        {pathname === '/' && <RealtimeBanner alerts={alerts} onOpen={() => setAlertOpen(true)} />}
        <div className="content">
          <Outlet context={{ setToast, openAlerts: () => setAlertOpen(true) }} />
        </div>
      </div>
      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  )
}

const FILTERS = ['전체', '긴급', '미조치', '상습']

function AlertDropdown({ alerts, onClose, onReadAll, onRead }) {
  const [filter, setFilter] = useState('전체')
  const ref = useRef(null)
  useEffect(() => {
    const close = (e) => !ref.current?.contains(e.target) && !e.target.closest('.bell') && onClose()
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [onClose])
  const list = useMemo(() => (filter === '전체' ? alerts : alerts.filter((a) => a.type === filter)), [alerts, filter])
  const count = (f) => (f === '전체' ? alerts.length : alerts.filter((a) => a.type === f).length)

  return (
    <div className="alert-dd" ref={ref}>
      <div className="alert-dd__head">
        <p>위험 이벤트 알림</p>
        <button onClick={onReadAll}>모두 읽음</button>
      </div>
      <div className="alert-dd__chips">
        {FILTERS.map((f) => (
          <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
            {f} {count(f)}
          </button>
        ))}
      </div>
      <div className="alert-dd__list">
        {list.map((a) => {
          const t = ALERT_TYPES[a.type]
          const icon = t.icon === 'alert' ? A.icAlert : t.icon === 'warning' ? A.icStatusWarning : A.icStatusMinor
          return (
            <button key={a.id} className="alert-row" onClick={() => onRead(a.id)}>
              <i style={{ background: t.bar }} />
              <span className="alert-row__icon" style={{ background: t.bg }}>
                <img src={icon} alt="" />
              </span>
              <span className="alert-row__text">
                <b>{a.title}</b>
                <small>{a.desc}</small>
                <em style={{ background: t.bg, color: t.fg }}>{a.type}</em>
              </span>
              <span className="alert-row__right">
                <small>{a.time}</small>
                {a.unread && <img src={A.unreadDot} alt="미읽음" />}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function RealtimeBanner({ alerts, onOpen }) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 8000)
    return () => clearTimeout(t)
  }, [])
  const urgent = alerts.filter((a) => a.unread && a.type === '긴급')
  if (!visible || !urgent.length) return null
  return (
    <button className="rt-banner" onClick={onOpen}>
      <img src={A.realtimeDot} alt="" />
      <b>실시간 알림</b>
      {urgent.map((a) => (
        <em key={a.id}>{a.title}</em>
      ))}
    </button>
  )
}
