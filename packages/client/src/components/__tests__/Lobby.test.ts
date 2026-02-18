import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
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

function createTestRouter(initialPath = '/room/ABC123') {
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

  async function mountLobby(path = '/room/ABC123') {
    const router = createTestRouter(path);
    await router.push(path);
    await router.isReady();
    const wrapper = mount(Lobby, {
      global: {
        plugins: [router],
        stubs: { RoomCode: true },
      },
    });
    await flushPromises();
    return { wrapper, router };
  }

  // Player list rendering
  describe('player list rendering', () => {
    it('renders all players from roomState', async () => {
      const { wrapper } = await mountLobby();
      expect(wrapper.text()).toContain('Alice');
      expect(wrapper.text()).toContain('Bob');
    });

    it('shows player count', async () => {
      const { wrapper } = await mountLobby();
      expect(wrapper.text()).toContain('2/4');
    });

    it('marks current player with (You)', async () => {
      const { wrapper } = await mountLobby();
      // player-1 is Alice and is the current player
      expect(wrapper.text()).toContain('(You)');
    });

    it('shows host indicator (star) for host player', async () => {
      const { wrapper } = await mountLobby();
      // The star character ★ should be present for the host
      expect(wrapper.html()).toContain('★');
    });
  });

  // Host controls
  describe('host controls', () => {
    it('shows Start Game button for host', async () => {
      const { wrapper } = await mountLobby();
      const startBtn = wrapper.findAll('button').find(b => b.text().includes('Start Game') || b.text().includes('Waiting for players'));
      expect(startBtn).toBeTruthy();
    });

    it('disables Start Game when not enough players', async () => {
      const s = useGameSocket() as any;
      s.roomState.value = createRoomState({
        players: [{ id: 'player-1', nickname: 'Alice', isHost: true }],
      });
      const { wrapper } = await mountLobby();
      const startBtn = wrapper.findAll('button').find(b => b.text().includes('Waiting for players'));
      expect(startBtn).toBeTruthy();
      expect(startBtn!.element.disabled).toBe(true);
    });

    it('enables Start Game when minimum players met', async () => {
      // Default roomState has 2 players which meets minPlayers: 2
      const { wrapper } = await mountLobby();
      const startBtn = wrapper.findAll('button').find(b => b.text().includes('Start Game'));
      expect(startBtn).toBeTruthy();
      expect(startBtn!.element.disabled).toBe(false);
    });

    it('sends start-game message on Start click', async () => {
      const s = useGameSocket() as any;
      const { wrapper } = await mountLobby();
      const startBtn = wrapper.findAll('button').find(b => b.text().includes('Start Game'));
      await startBtn!.trigger('click');
      expect(s.send).toHaveBeenCalledWith({ type: 'start-game' });
    });
  });

  // Non-host view
  describe('non-host view', () => {
    it('shows waiting message for non-host', async () => {
      const s = useGameSocket() as any;
      s.playerId.value = 'player-2';
      const { wrapper } = await mountLobby();
      expect(wrapper.text()).toContain('Waiting for host to start');
    });

    it('does not show Start Game button for non-host', async () => {
      const s = useGameSocket() as any;
      s.playerId.value = 'player-2';
      const { wrapper } = await mountLobby();
      const startBtn = wrapper.findAll('button').find(b =>
        b.text().includes('Start Game') || b.text().includes('Waiting for players')
      );
      expect(startBtn).toBeUndefined();
    });
  });

  // Leave room
  describe('leave room', () => {
    it('sends leave-room on Leave click and navigates to landing', async () => {
      const s = useGameSocket() as any;
      const { wrapper, router } = await mountLobby();
      const leaveBtn = wrapper.findAll('button').find(b => b.text().includes('Leave Room'));
      expect(leaveBtn).toBeTruthy();
      await leaveBtn!.trigger('click');
      expect(s.send).toHaveBeenCalledWith({ type: 'leave-room' });
      await flushPromises();
      expect(router.currentRoute.value.path).toBe('/');
    });
  });
});
