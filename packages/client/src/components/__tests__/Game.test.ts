import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { render, screen, waitFor } from '@testing-library/vue';
import { createRouter, createWebHashHistory } from 'vue-router';

vi.mock('../../composables/useGameSocket', () => {
  let _cache: any = null;
  const create = () => ({
    send: vi.fn(),
    onMessage: vi.fn(() => vi.fn()),
    gameView: ref<any>(null),
    shitheadNickname: ref<string | null>(null),
    isSpectator: ref(false),
    spectatorGameView: ref(null),
  });
  return { useGameSocket: () => { if (!_cache) _cache = create(); return _cache; } };
});

import { useGameSocket } from '../../composables/useGameSocket';
import Game from '../Game.vue';

function createTestRouter() {
  return createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/', name: 'landing', component: { template: '<div />' } },
      { path: '/game', name: 'game', component: { template: '<div />' } },
      { path: '/room/:code', name: 'lobby', component: { template: '<div />' } },
      { path: '/discord-lobby', name: 'discord-lobby', component: { template: '<div />' } },
    ],
  });
}

describe('Game.vue', () => {
  beforeEach(() => {
    const s = useGameSocket() as any;
    s.gameView.value = null;
    s.shitheadNickname.value = null;
    s.isSpectator.value = false;
    s.spectatorGameView.value = null;
    s.send = vi.fn();
    s.onMessage = vi.fn(() => vi.fn());
    vi.clearAllMocks();
    localStorage.clear();
  });

  async function renderGame(gameViewOverride: any = null) {
    const router = createTestRouter();
    const s = useGameSocket() as any;
    if (gameViewOverride) {
      s.gameView.value = gameViewOverride;
    }
    await router.push('/game');
    await router.isReady();
    render(Game, {
      global: {
        plugins: [router],
        stubs: { SwapPhase: true, PlayingPhase: true },
      },
    });
    return { router };
  }

  describe('finished phase', () => {
    it('renders shithead emoji with proper ARIA attributes', async () => {
      await renderGame({ phase: 'finished' });
      const s = useGameSocket() as any;
      s.shitheadNickname.value = 'Bob';

      await waitFor(() => {
        const emojiSpan = screen.getByRole('img', { name: 'Shithead' });
        expect(emojiSpan).toBeInTheDocument();
      });
    });

    it('shows Game Over text', async () => {
      await renderGame({ phase: 'finished' });
      expect(screen.getByText('Game Over')).toBeInTheDocument();
    });
  });

  describe('leave confirmation modal', () => {
    it('does not show modal by default', async () => {
      await renderGame({ phase: 'playing' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
