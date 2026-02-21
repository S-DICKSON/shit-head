import { createRouter, createWebHashHistory } from 'vue-router';
import { watch } from 'vue';
import { useGameSocket } from './composables/useGameSocket';

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: () => import('./components/Landing.vue'),
    },
    {
      path: '/room/:code',
      name: 'lobby',
      component: () => import('./components/Lobby.vue'),
    },
    {
      path: '/game',
      name: 'game',
      component: () => import('./components/Game.vue'),
    },
    {
      path: '/discord-lobby',
      name: 'discord-lobby',
      component: () => import('./components/DiscordLobby.vue'),
    },
  ],
});

// Router guard to wait for reconnect before deciding navigation
router.beforeEach(async (to, _from) => {
  const { reconnecting, roomState, gameView } = useGameSocket();

  // If we're reconnecting, wait for it to complete before deciding navigation
  if (reconnecting.value) {
    // Wait for reconnecting to become false (max 5 seconds timeout)
    await new Promise<void>((resolve) => {
      const unwatch = watch(reconnecting, (val) => {
        if (!val) {
          unwatch();
          resolve();
        }
      });
      // Safety timeout
      setTimeout(() => { unwatch(); resolve(); }, 5000);
    });
  }

  // After reconnect resolves, check if we should redirect
  if (to.name === 'landing') {
    // If we have game state, go directly to game
    if (gameView.value) {
      return { name: 'game' };
    }
    // If we have room state, go to lobby
    if (roomState.value) {
      return { path: `/room/${roomState.value.code}` };
    }
  }

  // Share link: allow navigating to lobby without room state (will auto-join as Guest)
  if (to.name === 'lobby' && !roomState.value) {
    return true;
  }

  // Continue to requested route
  return true;
});
