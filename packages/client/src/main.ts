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
  throw new Error('Discord adapters not implemented yet (Phase 18)')
}

app.use(router)
app.mount('#app')
