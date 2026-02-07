import { createRouter, createWebHashHistory } from 'vue-router';

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
  ],
});
