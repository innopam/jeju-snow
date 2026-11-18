import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { A } from '../assets'
import { canAccess, logout, sessionStore } from '../auth'
import { ALERT_TYPES, alertStore, pushIncoming } from '../data/alerts'
import type { AlertItem } from '../data/alerts'
import { PAGE_TITLES } from '../data/routes'
import { useStore } from '../store'
import { BP, useMedia } from '../useMedia'
import { EmptyState, Toast } from './Controls'
import Icon from './Icon'
import './layout.css'

const MENU = [
  { to: '/', label: '통합 관제 대시보드', icon: A.icMenuDashboard },
  { to: '/stats', label: '통계', icon: A.icMenuChart },
  { to: '/fusion', label: '기상·제설 융합 분석', icon: A.icMenuFusion },
]
const REALTIME_INTERVAL = 45000 // 신규 위험 이벤트 수신 주기(목업)

// Outlet 으로 페이지에 넘기는 값
export interface LayoutContext {
  setToast: (message: string) => void
  openAlerts: (filter?: string) => void
}

export default function Layout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const session = useStore(sessionStore)
  const alerts = useStore(alertStore)
  const isMobile = useMedia(BP.mobile)
  const isTablet = useMedia(BP.tablet)
  const [collapsedPref, setCollapsed] = useState<boolean | null>(null) // null = 화면 크기에 맞춤
  const collapsed = collapsedPref ?? (isTablet && !isMobile)
  const [drawer, setDrawer] = useState(false) // 모바일 메뉴
  const [alertFilter, setAlertFilter] = useState<string | null>(null) // null = 닫힘
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
  const goToAlert = (a: AlertItem) => {
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
          <nav className="crumb" aria-label="현재 위치">
            <NavLink to="/">홈</NavLink>
            <span>/</span>
            <h1>{title}</h1>
          </nav>
          <div className="topbar__right">
            <p className="topbar__user" title={`${session?.role} · 로그인 ${session?.loginAt ?? ''}`}>
              <span className="topbar__avatar"><Icon name="user" /></span>
              <span className="topbar__name"><b>{session?.dept} {session?.name}</b><small>({session?.role})</small></span>
            </p>
            <button className="bell" onClick={() => setAlertFilter((f) => (f ? null : '전체'))} aria-label={`위험 이벤트 알림 ${unread}건`}>
              <Icon name="bell" />
              {unread > 0 && <span className="bell__count">{unread > 99 ? 99 : unread}</span>}
            </button>
            <button className="logout-pill" onClick={onLogout}>
              <Icon name="logout" />
              로그아웃
            </button>
          </div>
          {/* 실시간 알림 바 — GNB 레이어 안에 두어 GNB 위로 겹쳐 보이고, 알림 패널보다는 아래 */}
          {pathname === '/' && <RealtimeBanner alerts={alerts} onSelect={goToAlert} />}
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
        <div className="content">
          <Outlet context={{ setToast, openAlerts } satisfies LayoutContext} />
        </div>
      </div>
      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  )
}

const FILTERS = ['전체', '긴급', '미조치', '재결빙', '상습']
// 칩 숫자 색 — component library status-count (neutral · danger · warning · info · success)
const CHIP_COUNT: Record<string, string> = { 전체: '', 긴급: 'count--danger', 미조치: 'count--warning', 재결빙: 'count--info', 상습: 'count--success' }
// '재결빙'은 알림 종류가 아니라 재결빙 위험 구간 알림(refreeze)을 모아 보는 필터
const matches = (a: AlertItem, f: string) => f === '전체' || (f === '재결빙' ? a.refreeze : a.type === f)

interface AlertDropdownProps {
  alerts: AlertItem[]
  filter: string
  onFilter: (filter: string) => void
  onClose: () => void
  onReadAll: () => void
  onSelect: (a: AlertItem) => void
}
function AlertDropdown({ alerts, filter, onFilter, onClose, onReadAll, onSelect }: AlertDropdownProps) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const close = (e: MouseEvent) => {
      const el = e.target as Element // mousedown 대상은 요소
      return !ref.current?.contains(el) && !el.closest('.bell') && !el.closest('[data-open-alerts]') && onClose()
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [onClose])
  const list = useMemo(() => alerts.filter((a) => matches(a, filter)), [alerts, filter])
  const count = (f: string) => alerts.filter((a) => matches(a, f)).length

  return (
    <div className="alert-dd" ref={ref} role="dialog" aria-label="위험 이벤트 알림">
      <div className="alert-dd__head">
        <p>위험 이벤트 알림</p>
        <button onClick={onReadAll}>모두 읽음</button>
      </div>
      {/* 알림 필터 — 디자인 가이드 Chips (component library Status/Icon Tab), 숫자 색은 상태별 */}
      <div className="chips alert-dd__chips" role="group" aria-label="알림 필터">
        {FILTERS.map((f) => (
          <button key={f} type="button" aria-pressed={filter === f} className={filter === f ? 'on' : ''} onClick={() => onFilter(f)}>
            <span>{f}</span>
            <strong className={CHIP_COUNT[f]}>{count(f)}</strong>
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
                <em className={`grade grade--${t.grade}`}>{a.type}</em>
              </span>
              <span className="alert-row__right">
                <small>{a.time}</small>
                {a.unread && <img src={A.unreadDot} alt="미확인" />}
              </span>
            </button>
          )
        })}
        {list.length === 0 && <div className="alert-dd__empty"><EmptyState message="해당 알림이 없습니다." /></div>}
      </div>
    </div>
  )
}

// 실시간 알림 바 — 신규 위험 이벤트가 생기면 지도 상단에 잠시 노출 (UI-SIRS-001-05 ①)
function RealtimeBanner({ alerts, onSelect }: { alerts: AlertItem[]; onSelect: (a: AlertItem) => void }) {
  const urgent = alerts.filter((a) => a.unread && a.type === '긴급').slice(0, 2)
  const latestId = alerts[0]?.id
  const [hiddenFor, setHiddenFor] = useState<number | null | undefined>(null)
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
