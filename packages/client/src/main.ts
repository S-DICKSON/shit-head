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
  DiscordAuthAdapter,
  DiscordConnectionAdapter,
  DiscordRoomAdapter,
} from './platform'

const app = createApp(App)

// Detect platform and provide adapters
const platform = detectPlatform()
console.log(`[Platform] Running in ${platform} mode`)

app.provide(PlatformKey, platform)

if (platform === 'web') {
  app.provide(AuthAdapterKey, new WebAuthAdapter())
  app.provide(ConnectionAdapterKey, new WebConnectionAdapter())
  app.provide(RoomAdapterKey, new WebRoomAdapter())
} else if (platform === 'discord') {
  const discordAuth = new DiscordAuthAdapter(import.meta.env.VITE_DISCORD_CLIENT_ID)
  app.provide(AuthAdapterKey, discordAuth)
  app.provide(ConnectionAdapterKey, new DiscordConnectionAdapter())
  app.provide(RoomAdapterKey, new DiscordRoomAdapter())
}

app.use(router)
app.mount('#app')
