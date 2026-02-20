import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, nextTick } from 'vue';
import { render, screen, fireEvent } from '@testing-library/vue';
import { createRouter, createWebHashHistory } from 'vue-router';

// vi.mock is hoisted before all imports — must be declared before any import of the mocked module
vi.mock('../../composables/useGameSocket', () => {
  let _cache: any = null;
  const create = () => ({
    send: vi.fn(),
    onMessage: vi.fn(() => vi.fn()),
    status: ref('OPEN'),
    roomState: ref(null),
    gameView: ref(null),
    error: ref<string | null>(null),
  });
  return { useGameSocket: () => { if (!_cache) _cache = create(); return _cache; } };
});

import { useGameSocket } from '../../composables/useGameSocket';
import Landing from '../Landing.vue';

function createTestRouter() {
  return createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/room/:code', component: { template: '<div />' } },
      { path: '/game', component: { template: '<div />' } },
    ],
  });
}

describe('Landing.vue', () => {
  beforeEach(() => {
    const s = useGameSocket() as any;
    s.status.value = 'OPEN';
    s.roomState.value = null;
    s.gameView.value = null;
    s.error.value = null;
    // Reassign fresh spies so clearMocks config doesn't break them
    s.send = vi.fn();
    s.onMessage = vi.fn(() => vi.fn());
    vi.clearAllMocks();
  });

  async function renderLanding() {
    const router = createTestRouter();
    await router.push('/');
    await router.isReady();
    render(Landing, { global: { plugins: [router] } });
    return { router };
  }

  // Connection state rendering
  describe('connection state rendering', () => {
    it('shows connecting banner when status is CONNECTING', async () => {
      const s = useGameSocket() as any;
      s.status.value = 'CONNECTING';
      await renderLanding();
      expect(screen.getByText(/Connecting to server/)).toBeInTheDocument();
    });

    it('shows not connected banner when status is CLOSED', async () => {
      const s = useGameSocket() as any;
      s.status.value = 'CLOSED';
      await renderLanding();
      expect(screen.getByText(/Not connected/)).toBeInTheDocument();
    });

    it('hides connection banners when status is OPEN', async () => {
      await renderLanding();
      expect(screen.queryByText(/Connecting to server/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Not connected/)).not.toBeInTheDocument();
    });
  });

  // Create room button logic
  describe('Create room button', () => {
    it('disables Create button when no nickname', async () => {
      await renderLanding();
      const createBtn = screen.getByRole('button', { name: /Create New Room/ });
      expect(createBtn).toBeDisabled();
    });

    it('enables Create button when nickname provided and connected', async () => {
      await renderLanding();
      const nicknameInput = document.querySelector('#nickname') as HTMLInputElement;
      await fireEvent.update(nicknameInput, 'Alice');
      await nextTick();
      const createBtn = screen.getByRole('button', { name: /Create New Room/ });
      expect(createBtn).not.toBeDisabled();
    });

    it('sends create-room message on Create click', async () => {
      const s = useGameSocket() as any;
      await renderLanding();
      const nicknameInput = document.querySelector('#nickname') as HTMLInputElement;
      await fireEvent.update(nicknameInput, 'Bob');
      await nextTick();
      const createBtn = screen.getByRole('button', { name: /Create New Room/ });
      await fireEvent.click(createBtn);
      expect(s.send).toHaveBeenCalledWith({ type: 'create-room', nickname: 'Bob' });
    });
  });

  // Join room button logic
  describe('Join room button', () => {
    it('disables Join button when no room code', async () => {
      await renderLanding();
      const nicknameInput = document.querySelector('#nickname') as HTMLInputElement;
      await fireEvent.update(nicknameInput, 'Alice');
      await nextTick();
      const joinBtn = screen.getByRole('button', { name: /Join Room/ });
      expect(joinBtn).toBeDisabled();
    });

    it('enables Join button when nickname and 6-char code provided', async () => {
      await renderLanding();
      const nicknameInput = document.querySelector('#nickname') as HTMLInputElement;
      await fireEvent.update(nicknameInput, 'Alice');
      await nextTick();

      // Simulate entering a room code via the @input handler
      const roomCodeInput = document.querySelector('#roomCode') as HTMLInputElement;
      await fireEvent.input(roomCodeInput, { target: { value: 'ABC123' } });
      await nextTick();

      const joinBtn = screen.getByRole('button', { name: /Join Room/ });
      expect(joinBtn).not.toBeDisabled();
    });

    it('sends join-room message on Join click', async () => {
      const s = useGameSocket() as any;
      await renderLanding();

      const nicknameInput = document.querySelector('#nickname') as HTMLInputElement;
      await fireEvent.update(nicknameInput, 'Carol');
      await nextTick();

      const roomCodeInput = document.querySelector('#roomCode') as HTMLInputElement;
      // Manually set value then trigger input so handleRoomCodeInput processes it
      roomCodeInput.value = 'XYZ789';
      await fireEvent.input(roomCodeInput, { target: { value: 'XYZ789' } });
      await nextTick();

      const joinBtn = screen.getByRole('button', { name: /Join Room/ });
      await fireEvent.click(joinBtn);
      expect(s.send).toHaveBeenCalledWith({ type: 'join-room', code: 'XYZ789', nickname: 'Carol' });
    });
  });

  // Room code input formatting
  describe('room code input formatting', () => {
    it('uppercases room code input', async () => {
      await renderLanding();
      const roomCodeInput = document.querySelector('#roomCode') as HTMLInputElement;
      await fireEvent.input(roomCodeInput, { target: { value: 'abc123' } });
      await nextTick();
      // After processing via handleRoomCodeInput, roomCode ref should be uppercase
      // The :value binding reflects the reactive roomCode ref
      expect(roomCodeInput.value.toUpperCase()).toBe(roomCodeInput.value);
    });

    it('strips non-alphanumeric characters from room code', async () => {
      await renderLanding();
      const roomCodeInput = document.querySelector('#roomCode') as HTMLInputElement;
      await fireEvent.input(roomCodeInput, { target: { value: 'ab-12!' } });
      await nextTick();
      // The :value binding is controlled by roomCode ref which strips non-alphanumeric
      // After nextTick re-render the :value attribute reflects the processed value
      const displayedValue = roomCodeInput.getAttribute('value') ?? roomCodeInput.value;
      expect(displayedValue).not.toContain('-');
      expect(displayedValue).not.toContain('!');
    });
  });
});
