import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backendScopedApiPaths =
  /^\/api\/(?:feed|tasks(?:\/|$)|completion_posts(?:\/|$))/

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target:
          process.env.API_BASE_URL ||
          process.env.VITE_API_BASE_URL ||
          'http://localhost:3001',
        changeOrigin: false,
        rewrite: (path) =>
          backendScopedApiPaths.test(path) ? path : path.replace(/^\/api/, ''),
      },
    },
  },
})
