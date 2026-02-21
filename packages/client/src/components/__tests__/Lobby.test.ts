import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { render, screen, fireEvent, waitFor } from '@testing-library/vue';
import { createRouter, createWebHashHistory } from 'vue-router';

// vi.mock is hoisted before all imports — must be declared before any import of the mocked module
vi.mock('../../composables/useGameSocket', () => {
  let _cache: any = null;
  const create = () => ({
    send: vi.fn(),
    onMessage: vi.fn(() => vi.fn()),
    roomState: ref<any>(null),
    playerId: ref<string | null>('player-1'),
    gameView: ref(null),
    status: ref('OPEN'),
  });
  return { useGameSocket: () => { if (!_cache) _cache = create(); return _cache; } };
});

import { useGameSocket } from '../../composables/useGameSocket';
import Lobby from '../Lobby.vue';

function createTestRouter() {
  const router = createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/', name: 'landing', component: { template: '<div />' } },
      { path: '/room/:code', name: 'lobby', component: { template: '<div />' } },
      { path: '/game', name: 'game', component: { template: '<div />' } },
    ],
  });
  return router;
}

function createRoomState(overrides: any = {}) {
  return {
    code: 'ABC123',
    hostId: 'player-1',
    minPlayers: 2,
    maxPlayers: 4,
    players: [
      { id: 'player-1', nickname: 'Alice', isHost: true },
      { id: 'player-2', nickname: 'Bob', isHost: false },
    ],
    ...overrides,
  };
}

describe('Lobby.vue', () => {
  beforeEach(() => {
    const s = useGameSocket() as any;
    s.roomState.value = createRoomState();
    s.playerId.value = 'player-1';
    s.gameView.value = null;
    s.status.value = 'OPEN';
    // Reassign fresh spies so clearMocks config doesn't break them
    s.send = vi.fn();
    s.onMessage = vi.fn(() => vi.fn());
    vi.clearAllMocks();
    localStorage.clear();
  });

  async function renderLobby(path = '/room/ABC123') {
    const router = createTestRouter();
    await router.push(path);
    await router.isReady();
    render(Lobby, {
      global: {
        plugins: [router],
        stubs: { RoomCode: true },
      },
    });
    return { router };
  }

  // Player list rendering
  describe('player list rendering', () => {
    it('renders all players from roomState', async () => {
      await renderLobby();
      await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('shows player count', async () => {
      await renderLobby();
      await waitFor(() => expect(screen.getByText(/2\/4/)).toBeInTheDocument());
    });

    it('marks current player with (You)', async () => {
      await renderLobby();
      // player-1 is Alice and is the current player
      await waitFor(() => expect(screen.getByText('(You)')).toBeInTheDocument());
    });

    it('shows host indicator (star) for host player', async () => {
      await renderLobby();
      await waitFor(() => expect(document.body.innerHTML).toContain('\u2605'));
    });
  });

  // Host controls
  describe('host controls', () => {
    it('shows Start Game button for host', async () => {
      await renderLobby();
      await waitFor(() => {
        const btn = screen.queryByRole('button', { name: /Start Game|Waiting for players/ });
        expect(btn).toBeInTheDocument();
      });
    });

    it('disables Start Game when not enough players', async () => {
      const s = useGameSocket() as any;
      s.roomState.value = createRoomState({
        players: [{ id: 'player-1', nickname: 'Alice', isHost: true }],
      });
      await renderLobby();
      await waitFor(() => {
        const startBtn = screen.queryByRole('button', { name: /Waiting for players/ });
        expect(startBtn).toBeInTheDocument();
        expect(startBtn).toBeDisabled();
      });
    });

    it('enables Start Game when minimum players met', async () => {
      // Default roomState has 2 players which meets minPlayers: 2
      await renderLobby();
      await waitFor(() => {
        const startBtn = screen.queryByRole('button', { name: /Start Game/ });
        expect(startBtn).toBeInTheDocument();
        expect(startBtn).not.toBeDisabled();
      });
    });

    it('sends start-game message on Start click', async () => {
      const s = useGameSocket() as any;
      await renderLobby();
      await waitFor(() => expect(screen.queryByRole('button', { name: /Start Game/ })).toBeInTheDocument());
      const startBtn = screen.getByRole('button', { name: /Start Game/ });
      await fireEvent.click(startBtn);
      expect(s.send).toHaveBeenCalledWith({ type: 'start-game' });
    });
  });

  // Non-host view
  describe('non-host view', () => {
    it('shows waiting message for non-host', async () => {
      const s = useGameSocket() as any;
      s.playerId.value = 'player-2';
      await renderLobby();
      await waitFor(() => expect(screen.getByText(/Waiting for host to start/)).toBeInTheDocument());
    });

    it('does not show Start Game button for non-host', async () => {
      const s = useGameSocket() as any;
      s.playerId.value = 'player-2';
      await renderLobby();
      await waitFor(() => expect(screen.getByText(/Waiting for host to start/)).toBeInTheDocument());
      expect(screen.queryByRole('button', { name: /Start Game|Waiting for players/ })).not.toBeInTheDocument();
    });
  });

  // Leave room
  describe('leave room', () => {
    it('sends leave-room on Leave click and navigates to landing', async () => {
      const s = useGameSocket() as any;
      const { router } = await renderLobby();
      await waitFor(() => expect(screen.getByRole('button', { name: /Leave Room/ })).toBeInTheDocument());
      await fireEvent.click(screen.getByRole('button', { name: /Leave Room/ }));
      expect(s.send).toHaveBeenCalledWith({ type: 'leave-room' });
      await waitFor(() => expect(router.currentRoute.value.path).toBe('/'));
    });
  });
});
