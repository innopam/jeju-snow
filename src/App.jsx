import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { canAccess, sessionStore } from './auth.js'
import { useStore } from './store.js'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Stats from './pages/Stats.jsx'
import Fusion from './pages/Fusion.jsx'
import Monitoring from './pages/Monitoring.jsx'

const ROUTES = [
  { path: '/', element: <Dashboard /> },
  { path: '/stats', element: <Stats /> },
  { path: '/fusion', element: <Fusion /> },
  { path: '/monitoring', element: <Monitoring /> },
]

// 로그인하지 않았으면 로그인 화면으로, 권한 밖 메뉴면 대시보드로 보낸다.
function Guard({ path, children }) {
  const session = useStore(sessionStore)
  const location = useLocation()
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!canAccess(session, path)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Guard path="*"><Layout /></Guard>}>
        {ROUTES.map((r) => (
          <Route key={r.path} path={r.path} element={<Guard path={r.path}>{r.element}</Guard>} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
