import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages 커스텀 서브도메인(https://jeju-snow.innopam.com/) 루트 배포
export default defineConfig({
  base: '/',
  plugins: [react()],
})
