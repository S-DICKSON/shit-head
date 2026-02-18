import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
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

  async function mountLanding() {
    const router = createTestRouter();
    await router.push('/');
    await router.isReady();
    return { wrapper: mount(Landing, { global: { plugins: [router] } }), router };
  }

  // Connection state rendering
  describe('connection state rendering', () => {
    it('shows connecting banner when status is CONNECTING', async () => {
      const s = useGameSocket() as any;
      s.status.value = 'CONNECTING';
      const { wrapper } = await mountLanding();
      expect(wrapper.text()).toContain('Connecting to server');
    });

    it('shows not connected banner when status is CLOSED', async () => {
      const s = useGameSocket() as any;
      s.status.value = 'CLOSED';
      const { wrapper } = await mountLanding();
      expect(wrapper.text()).toContain('Not connected');
    });

    it('hides connection banners when status is OPEN', async () => {
      const { wrapper } = await mountLanding();
      expect(wrapper.text()).not.toContain('Connecting to server');
      expect(wrapper.text()).not.toContain('Not connected');
    });
  });

  // Create room button logic
  describe('Create room button', () => {
    it('disables Create button when no nickname', async () => {
      const { wrapper } = await mountLanding();
      const createBtn = wrapper.findAll('button').find(b => b.text().includes('Create New Room'));
      expect(createBtn).toBeTruthy();
      expect(createBtn!.element.disabled).toBe(true);
    });

    it('enables Create button when nickname provided and connected', async () => {
      const { wrapper } = await mountLanding();
      const nicknameInput = wrapper.find('#nickname');
      await nicknameInput.setValue('Alice');
      await nextTick();
      const createBtn = wrapper.findAll('button').find(b => b.text().includes('Create New Room'));
      expect(createBtn!.element.disabled).toBe(false);
    });

    it('sends create-room message on Create click', async () => {
      const s = useGameSocket() as any;
      const { wrapper } = await mountLanding();
      const nicknameInput = wrapper.find('#nickname');
      await nicknameInput.setValue('Bob');
      await nextTick();
      const createBtn = wrapper.findAll('button').find(b => b.text().includes('Create New Room'));
      await createBtn!.trigger('click');
      expect(s.send).toHaveBeenCalledWith({ type: 'create-room', nickname: 'Bob' });
    });
  });

  // Join room button logic
  describe('Join room button', () => {
    it('disables Join button when no room code', async () => {
      const { wrapper } = await mountLanding();
      const nicknameInput = wrapper.find('#nickname');
      await nicknameInput.setValue('Alice');
      await nextTick();
      const joinBtn = wrapper.findAll('button').find(b => b.text().includes('Join Room'));
      expect(joinBtn).toBeTruthy();
      expect(joinBtn!.element.disabled).toBe(true);
    });

    it('enables Join button when nickname and 6-char code provided', async () => {
      const { wrapper } = await mountLanding();
      const nicknameInput = wrapper.find('#nickname');
      await nicknameInput.setValue('Alice');
      await nextTick();

      // Simulate entering a room code via roomCode ref directly
      const roomCodeInput = wrapper.find('#roomCode');
      await roomCodeInput.setValue('ABC123');
      // Trigger the input event to run handleRoomCodeInput
      await roomCodeInput.trigger('input');
      await nextTick();

      const joinBtn = wrapper.findAll('button').find(b => b.text().includes('Join Room'));
      expect(joinBtn!.element.disabled).toBe(false);
    });

    it('sends join-room message on Join click', async () => {
      const s = useGameSocket() as any;
      const { wrapper } = await mountLanding();

      const nicknameInput = wrapper.find('#nickname');
      await nicknameInput.setValue('Carol');
      await nextTick();

      const roomCodeInput = wrapper.find('#roomCode');
      // Manually set the value then trigger input so handleRoomCodeInput processes it
      const inputEl = roomCodeInput.element as HTMLInputElement;
      inputEl.value = 'XYZ789';
      await roomCodeInput.trigger('input');
      await nextTick();

      const joinBtn = wrapper.findAll('button').find(b => b.text().includes('Join Room'));
      await joinBtn!.trigger('click');
      expect(s.send).toHaveBeenCalledWith({ type: 'join-room', code: 'XYZ789', nickname: 'Carol' });
    });
  });

  // Room code input formatting
  describe('room code input formatting', () => {
    it('uppercases room code input', async () => {
      const { wrapper } = await mountLanding();
      const roomCodeInput = wrapper.find('#roomCode');
      const inputEl = roomCodeInput.element as HTMLInputElement;
      inputEl.value = 'abc123';
      await roomCodeInput.trigger('input');
      await nextTick();
      // After processing via handleRoomCodeInput, roomCode ref should be uppercase
      // The :value binding reflects the reactive roomCode ref
      expect(inputEl.value.toUpperCase()).toBe(inputEl.value);
    });

    it('strips non-alphanumeric characters from room code', async () => {
      const { wrapper } = await mountLanding();
      const roomCodeInput = wrapper.find('#roomCode');
      const inputEl = roomCodeInput.element as HTMLInputElement;
      inputEl.value = 'ab-12!';
      await roomCodeInput.trigger('input');
      await nextTick();
      // The :value binding is controlled by roomCode ref which strips non-alphanumeric
      // After nextTick re-render the :value attribute reflects the processed value
      const displayedValue = roomCodeInput.attributes('value') ?? inputEl.value;
      expect(displayedValue).not.toContain('-');
      expect(displayedValue).not.toContain('!');
    });
  });
});
