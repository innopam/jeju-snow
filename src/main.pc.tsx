// PC 진입점 (index.html) — 주소는 /jeju-snow/stats 형태. 모바일 기기로 열면 모바일 진입점(mobile.html)으로 넘긴다.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { isMobileDevice, mobileUrl } from './entry'

if (isMobileDevice()) {
  window.location.replace(mobileUrl())
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
}
