import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages 프로젝트 사이트(https://innopamsolution.github.io/jeju-snow/) 하위 경로 배포
// 빌드 입력: PC(index.html) · 모바일(mobile.html) 두 HTML — 화면 컴포넌트는 함께 쓴다
export default defineConfig({
  base: '/jeju-snow/',
  plugins: [react()],
  build: {
    rolldownOptions: {
      input: { pc: 'index.html', mobile: 'mobile.html' },
    },
  },
})
