import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import http from 'node:http'
import type { Socket } from 'node:net'

const serverUrl = process.env.VITE_SERVER_URL || 'http://localhost:3000'

/**
 * Custom WebSocket proxy plugin.
 * Vite's built-in http-proxy ws:true doesn't reliably pipe the 101 upgrade
 * response back to the browser (especially with Bun servers in Docker).
 * This plugin manually handles the upgrade at the HTTP server level,
 * before Vite's HMR handler, ensuring reliable WebSocket proxying.
 */
function gameWsProxy(): Plugin {
  return {
    name: 'game-ws-proxy',
    configureServer(server) {
      const target = new URL(serverUrl)

      server.httpServer?.on('upgrade', (req, socket: Socket, _head) => {
        if (!req.url?.startsWith('/game-ws')) return

        const proxyReq = http.request({
          hostname: target.hostname,
          port: target.port,
          path: req.url,
          method: req.method,
          headers: {
            ...req.headers,
            host: `${target.hostname}:${target.port}`,
          },
        })

        proxyReq.on('upgrade', (_proxyRes, proxySocket: Socket, proxyHead) => {
          // Forward the raw 101 response back to the browser
          socket.write(
            'HTTP/1.1 101 Switching Protocols\r\n' +
            'Upgrade: websocket\r\n' +
            'Connection: Upgrade\r\n' +
            `Sec-WebSocket-Accept: ${_proxyRes.headers['sec-websocket-accept']}\r\n` +
            '\r\n'
          )

          if (proxyHead.length) socket.write(proxyHead)

          // Pipe data bidirectionally
          proxySocket.pipe(socket)
          socket.pipe(proxySocket)

          // Clean up on close
          socket.on('close', () => proxySocket.destroy())
          proxySocket.on('close', () => socket.destroy())
        })

        proxyReq.on('error', (err) => {
          console.error('[game-ws-proxy] error:', err.message)
          socket.destroy()
        })

        proxyReq.end()
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), tailwindcss(), gameWsProxy()],
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
    }
  }
})
