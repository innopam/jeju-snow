import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { A } from '../assets.js'
import { canAccess, logout, sessionStore } from '../auth.js'
import { ALERT_TYPES, alertStore, pushIncoming } from '../data/alerts.js'
import { PAGE_TITLES } from '../data/routes.js'
import { useStore } from '../store.js'
import { BP, useMedia } from '../useMedia.js'
import { Toast } from './Controls.jsx'
import './layout.css'

const MENU = [
  { to: '/', label: '통합 관제 대시보드', icon: A.icMenuDashboard },
  { to: '/stats', label: '통계', icon: A.icMenuChart },
  { to: '/fusion', label: '기상·제설 융합 분석', icon: A.icMenuFusion },
]
const REALTIME_INTERVAL = 45000 // 신규 위험 이벤트 수신 주기(목업)

export default function Layout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const session = useStore(sessionStore)
  const alerts = useStore(alertStore)
  const isMobile = useMedia(BP.mobile)
  const isTablet = useMedia(BP.tablet)
  const [collapsedPref, setCollapsed] = useState(null) // null = 화면 크기에 맞춤
  const collapsed = collapsedPref ?? (isTablet && !isMobile)
  const [drawer, setDrawer] = useState(false) // 모바일 메뉴
  const [alertFilter, setAlertFilter] = useState(null) // null = 닫힘
  const [toast, setToast] = useState('')
  const title = PAGE_TITLES[pathname] ?? PAGE_TITLES['/']
  const unread = alerts.filter((a) => a.unread).length

  // UC-EVT-001: 스마트빌리지 인프라 수신 데이터가 알림 조건에 맞으면 위험 이벤트 생성 (목업 주기)
  useEffect(() => {
    let n = 0
    const t = setInterval(() => {
      if (n >= 3) return clearInterval(t)
      pushIncoming(n++)
    }, REALTIME_INTERVAL)
    return () => clearInterval(t)
  }, [])

  const openAlerts = useCallback((filter = '전체') => setAlertFilter(filter), [])
  const goToAlert = (a) => {
    alertStore.set((list) => list.map((x) => (x.id === a.id ? { ...x, unread: false, fresh: false } : x)))
    setAlertFilter(null)
    setDrawer(false)
    navigate('/', { state: { focusSeg: a.seg, nonce: Date.now() } })
  }
  const onLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className={`app${drawer ? ' drawer-open' : ''}`}>
      {isMobile && drawer && <div className="lnb-backdrop" onClick={() => setDrawer(false)} />}
      <aside className={`lnb${collapsed && !isMobile ? ' collapsed' : ''}`}>
        <div className="lnb__brand">
          <img src={A.logo} alt="Jeju" />
          <p>제설·결빙 대응 시스템</p>
        </div>
        <button className="lnb__collapse" onClick={() => (isMobile ? setDrawer(false) : setCollapsed(!collapsed))} aria-label={isMobile ? '메뉴 닫기' : '메뉴 접기'}>
          <img src={A.icCollapse} alt="" />
        </button>
        <nav className="lnb__menu">
          {MENU.map((m) => (
            <NavLink key={m.to} to={m.to} end className={({ isActive }) => `lnb__item${isActive ? ' active' : ''}`} title={m.label} onClick={() => setDrawer(false)}>
              <img src={m.icon} alt="" />
              <span className="lnb__label">{m.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="lnb__bottom">
          {canAccess(session, '/monitoring') && (
            <NavLink to="/monitoring" className={({ isActive }) => `lnb__sub${isActive ? ' active' : ''}`} title="데이터 연계 모니터링" onClick={() => setDrawer(false)}>
              <img src={A.icMonitor} alt="" />
              <span className="lnb__label">데이터 연계 모니터링</span>
            </NavLink>
          )}
          <button className="lnb__sub" onClick={onLogout} title="로그아웃">
            <img src={A.icLogout} alt="" />
            <span className="lnb__label">로그아웃</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="topbar__menu" onClick={() => setDrawer(true)} aria-label="메뉴 열기">
            <span /><span /><span />
          </button>
          <h1>{title}</h1>
          <div className="topbar__right">
            <button className="bell" onClick={() => setAlertFilter((f) => (f ? null : '전체'))} aria-label={`위험 이벤트 알림 ${unread}건`}>
              <img src={A.icBell} alt="" />
              {unread > 0 && <span className="bell__count">{unread > 99 ? 99 : unread}</span>}
            </button>
            <p className="topbar__user" title={`${session?.role} · 로그인 ${session?.loginAt ?? ''}`}>
              <span className="topbar__name">{session?.dept} {session?.name} 님</span>
              <span className="role-tag">{session?.role}</span>
            </p>
          </div>
          {alertFilter && (
            <AlertDropdown
              alerts={alerts}
              filter={alertFilter}
              onFilter={setAlertFilter}
              onClose={() => setAlertFilter(null)}
              onReadAll={() => alertStore.set((list) => list.map((a) => ({ ...a, unread: false, fresh: false })))}
              onSelect={goToAlert}
            />
          )}
        </header>
        {pathname === '/' && <RealtimeBanner alerts={alerts} onSelect={goToAlert} />}
        <div className="content">
          <Outlet context={{ setToast, openAlerts }} />
        </div>
      </div>
      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  )
}

const FILTERS = ['전체', '긴급', '미조치', '상습']

function AlertDropdown({ alerts, filter, onFilter, onClose, onReadAll, onSelect }) {
  const ref = useRef(null)
  useEffect(() => {
    const close = (e) => !ref.current?.contains(e.target) && !e.target.closest('.bell') && !e.target.closest('[data-open-alerts]') && onClose()
    const esc = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [onClose])
  const list = useMemo(() => (filter === '전체' ? alerts : alerts.filter((a) => a.type === filter)), [alerts, filter])
  const count = (f) => (f === '전체' ? alerts.length : alerts.filter((a) => a.type === f).length)

  return (
    <div className="alert-dd" ref={ref} role="dialog" aria-label="위험 이벤트 알림">
      <div className="alert-dd__head">
        <p>위험 이벤트 알림</p>
        <button onClick={onReadAll}>모두 읽음</button>
      </div>
      <div className="alert-dd__chips" role="tablist">
        {FILTERS.map((f) => (
          <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? 'on' : ''} onClick={() => onFilter(f)}>
            {f} {count(f)}
          </button>
        ))}
      </div>
      <div className="alert-dd__list">
        {list.map((a) => {
          const t = ALERT_TYPES[a.type]
          const icon = t.icon === 'alert' ? A.icAlert : t.icon === 'warning' ? A.icStatusWarning : A.icStatusMinor
          return (
            <button key={a.id} className={`alert-row${a.fresh ? ' fresh' : ''}`} onClick={() => onSelect(a)} title="선택하면 해당 구간으로 지도를 이동합니다">
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
                {a.unread && <img src={A.unreadDot} alt="미확인" />}
              </span>
            </button>
          )
        })}
        {list.length === 0 && <p className="alert-dd__empty">알림이 없습니다.</p>}
      </div>
    </div>
  )
}

// 실시간 알림 바 — 신규 위험 이벤트가 생기면 지도 상단에 잠시 노출 (UI-SIRS-001-05 ①)
function RealtimeBanner({ alerts, onSelect }) {
  const urgent = alerts.filter((a) => a.unread && a.type === '긴급').slice(0, 2)
  const latestId = alerts[0]?.id
  const [hiddenFor, setHiddenFor] = useState(null)
  useEffect(() => {
    const t = setTimeout(() => setHiddenFor(latestId), 8000)
    return () => clearTimeout(t)
  }, [latestId])
  if (hiddenFor === latestId || !urgent.length) return null
  return (
    <div className="rt-banner" key={latestId}>
      <img src={A.realtimeDot} alt="" />
      <b>실시간 알림</b>
      {urgent.map((a) => (
        <button key={a.id} onClick={() => onSelect(a)} title={a.desc}>{a.title}</button>
      ))}
      <button className="rt-banner__close" onClick={() => setHiddenFor(latestId)} aria-label="알림 바 닫기">×</button>
    </div>
  )
}
