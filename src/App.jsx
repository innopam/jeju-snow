import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
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

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {ROUTES.map((r) => (
          <Route key={r.path} path={r.path} element={r.element} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
