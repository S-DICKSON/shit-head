import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  build: {
    outDir: 'dist',  // Output for CF Pages deployment
    // es2020 + chrome89 + safari15: baseline that covers Edge 89+ (Chromium-based).
    // main.ts uses an async IIFE (not bare top-level await) so no TLA downleveling needed.
    // Using named browser targets lets esbuild apply precise feature tables.
    target: ['es2020', 'chrome89', 'safari15'],
  },
  server: {
    host: '0.0.0.0',  // Required for Docker
    port: 5173,
    strictPort: true,
    allowedHosts: true,  // Allows ngrok tunnel hostnames
    hmr: {
      path: '/__hmr',  // Avoid conflict with game-ws proxy
    },
    proxy: {
      '/api': {
        target: 'http://host.docker.internal:3000',
        changeOrigin: true,
      },
      '/game-ws': {
        target: 'ws://host.docker.internal:3000',
        ws: true,
        changeOrigin: true,
      },
      '/.proxy/api': {
        target: 'http://host.docker.internal:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/.proxy/, ''),
      },
      '/.proxy/ws': {
        target: 'ws://host.docker.internal:3000',
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/.proxy\/ws/, '/game-ws'),
      },
    }
  }
})
