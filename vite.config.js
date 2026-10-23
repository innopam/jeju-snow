import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages 프로젝트 사이트(https://innopam.github.io/jeju-snow/) 하위 경로 배포
export default defineConfig({
  base: '/jeju-snow/',
  plugins: [react()],
})
