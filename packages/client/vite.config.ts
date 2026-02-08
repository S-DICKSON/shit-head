import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import net from 'node:net'

const serverUrl = process.env.VITE_SERVER_URL || 'http://localhost:3000'

/**
 * Custom WebSocket proxy plugin using raw TCP sockets.
 * Vite's built-in http-proxy ws:true doesn't reliably pipe the 101 upgrade
 * response back to the browser (Bun server + Docker). Using raw TCP avoids
 * relying on node:http upgrade events which may not fire under Bun.
 */
function gameWsProxy(): Plugin {
  return {
    name: 'game-ws-proxy',
    configureServer(server) {
      const target = new URL(serverUrl)

      server.httpServer?.on('upgrade', (req, socket: net.Socket, _head) => {
        if (!req.url?.startsWith('/game-ws')) return

        // Connect raw TCP socket to the backend server
        const proxySocket = net.connect(
          { host: target.hostname, port: Number(target.port) },
          () => {
            // Build and send the HTTP upgrade request
            const headers = Object.entries(req.headers)
              .filter(([key]) => key !== 'host')
              .map(([key, value]) => `${key}: ${value}`)
              .join('\r\n')

            proxySocket.write(
              `${req.method} ${req.url} HTTP/1.1\r\n` +
              `Host: ${target.hostname}:${target.port}\r\n` +
              `${headers}\r\n` +
              '\r\n'
            )

            // Pipe everything bidirectionally — the 101 response and
            // all subsequent WebSocket frames flow through transparently
            proxySocket.pipe(socket)
            socket.pipe(proxySocket)
          }
        )

        proxySocket.on('error', (err) => {
          console.error('[game-ws-proxy] error:', err.message)
          socket.destroy()
        })

        socket.on('close', () => proxySocket.destroy())
        proxySocket.on('close', () => socket.destroy())
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
