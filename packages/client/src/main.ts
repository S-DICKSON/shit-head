import './style.css'
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import {
  detectPlatform,
  PlatformKey,
  AuthAdapterKey,
  ConnectionAdapterKey,
  RoomAdapterKey,
  WebAuthAdapter,
  WebConnectionAdapter,
  WebRoomAdapter,
} from './platform'

// Wrap in async IIFE so no top-level await appears in the bundle.
// Top-level await requires Edge 92+ natively; wrapping ensures Edge 89+ compatibility.
void (async () => {
  const app = createApp(App)

  // Detect platform and provide adapters
  let platform = detectPlatform()
  console.log(`[Platform] Running in ${platform} mode`)

  if (platform === 'discord') {
    try {
      // Dynamic import ensures @discord/embedded-app-sdk is never resolved in web mode
      const { DiscordAuthAdapter } = await import('./platform/adapters/discord/DiscordAuthAdapter')
      const { DiscordConnectionAdapter } = await import('./platform/adapters/discord/DiscordConnectionAdapter')
      const { DiscordRoomAdapter } = await import('./platform/adapters/discord/DiscordRoomAdapter')
      const { patchUrlMappings } = await import('@discord/embedded-app-sdk')

      // Rewrite external URLs (like CDN avatar images) to go through Discord's proxy
      patchUrlMappings([{ prefix: '/cdn', target: 'cdn.discordapp.com' }], { patchSrcAttributes: true })

      const discordAuth = new DiscordAuthAdapter(import.meta.env.VITE_DISCORD_CLIENT_ID)
      app.provide(AuthAdapterKey, discordAuth)
      app.provide(ConnectionAdapterKey, new DiscordConnectionAdapter())
      app.provide(RoomAdapterKey, new DiscordRoomAdapter())
    } catch (err) {
      console.error('[Platform] Discord init failed, falling back to web mode:', err)
      platform = 'web'
    }
  }

  if (platform === 'web') {
    app.provide(AuthAdapterKey, new WebAuthAdapter())
    app.provide(ConnectionAdapterKey, new WebConnectionAdapter())
    app.provide(RoomAdapterKey, new WebRoomAdapter())
  }

  app.provide(PlatformKey, platform)
  app.use(router)
  app.mount('#app')

  if (platform === 'discord') {
    router.push('/discord-lobby')
  }
})()
