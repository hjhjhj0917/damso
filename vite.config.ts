import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // /api 요청을 백엔드로 넘깁니다. 프록시를 두면 브라우저 입장에서 같은 출처가 되어
    // 개발 중에도 세션 쿠키가 그대로 실리고 CORS 설정에 기대지 않아도 됩니다.
    proxy: {
      '/api': {
        target: 'http://localhost:11000',
      },
    },
  },
})
