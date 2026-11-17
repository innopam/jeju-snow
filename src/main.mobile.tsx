// 모바일 진입점 (mobile.html) — 정적 호스팅에서 새로고침해도 열리도록 주소는 mobile.html#/stats 형태(HashRouter).
// 화면 컴포넌트는 PC 와 같고, 화면 폭에 따라 반응형으로 배치된다.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App'

document.documentElement.classList.add('is-mobile-entry')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
