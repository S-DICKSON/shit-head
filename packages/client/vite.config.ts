import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

const serverUrl = process.env.VITE_SERVER_URL || 'http://localhost:3000'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    host: '0.0.0.0',  // Required for Docker
    port: 5173,
    strictPort: true,
    allowedHosts: true,  // Allows ngrok tunnel hostnames
    hmr: {
      path: '/__hmr',  // Avoid conflict with game-ws proxy
    },
    proxy: {
      '/api': serverUrl,
      '/game-ws': {
        target: serverUrl.replace('http', 'ws'),
        ws: true,
        changeOrigin: true,  // Rewrites Host header for WebSocket handshake
      },
    }
  }
})
