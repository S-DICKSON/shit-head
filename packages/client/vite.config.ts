import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

const serverUrl = process.env.VITE_SERVER_URL || 'http://localhost:3000'
const wsUrl = serverUrl.replace(/^http/, 'ws')

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    host: '0.0.0.0',  // Required for Docker
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': serverUrl,
      '/ws': { target: wsUrl, ws: true }
    }
  }
})
