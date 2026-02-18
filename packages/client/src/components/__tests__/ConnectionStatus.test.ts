import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { mount } from '@vue/test-utils';

vi.mock('../../composables/useGameSocket', () => {
  let _cache: any = null;
  const create = () => ({
    connectionState: ref<'connected' | 'connecting' | 'reconnecting' | 'failed'>('connected'),
    connectionError: ref<{ message: string; code: string; timestamp: number; retryCount: number } | null>(null),
    retryConnection: vi.fn(),
  });
  return { useGameSocket: () => { if (!_cache) _cache = create(); return _cache; } };
});

import { useGameSocket } from '../../composables/useGameSocket';
import ConnectionStatus from '../ConnectionStatus.vue';

describe('ConnectionStatus.vue', () => {
  beforeEach(() => {
    const s = useGameSocket() as any;
    s.connectionState.value = 'connected';
    s.connectionError.value = null;
    vi.clearAllMocks();
  });

  it('does not render overlay when connected', () => {
    const s = useGameSocket() as any;
    s.connectionState.value = 'connected';
    const wrapper = mount(ConnectionStatus);
    expect(wrapper.find('.fixed').exists()).toBe(false);
  });

  it('shows reconnecting spinner when connectionState is reconnecting', () => {
    const s = useGameSocket() as any;
    s.connectionState.value = 'reconnecting';
    const wrapper = mount(ConnectionStatus);
    expect(wrapper.text()).toContain('Reconnecting...');
  });

  it('shows Connection Failed when connectionState is failed', () => {
    const s = useGameSocket() as any;
    s.connectionState.value = 'failed';
    s.connectionError.value = {
      message: 'Server unreachable',
      code: 'CONNECTION_FAILED',
      timestamp: Date.now(),
      retryCount: 5,
    };
    const wrapper = mount(ConnectionStatus);
    expect(wrapper.text()).toContain('Connection Failed');
    expect(wrapper.text()).toContain('Server unreachable');
  });

  it('shows retry button when failed', () => {
    const s = useGameSocket() as any;
    s.connectionState.value = 'failed';
    s.connectionError.value = {
      message: 'Server unreachable',
      code: 'CONNECTION_FAILED',
      timestamp: Date.now(),
      retryCount: 5,
    };
    const wrapper = mount(ConnectionStatus);
    const button = wrapper.find('button');
    expect(button.exists()).toBe(true);
    expect(button.text()).toContain('Retry');
  });

  it('clicking retry button calls retryConnection', async () => {
    const s = useGameSocket() as any;
    s.connectionState.value = 'failed';
    s.connectionError.value = {
      message: 'Server unreachable',
      code: 'CONNECTION_FAILED',
      timestamp: Date.now(),
      retryCount: 5,
    };
    const wrapper = mount(ConnectionStatus);
    const button = wrapper.find('button');
    await button.trigger('click');
    expect(s.retryConnection).toHaveBeenCalledOnce();
  });

  it('does not render overlay when connecting', () => {
    const s = useGameSocket() as any;
    s.connectionState.value = 'connecting';
    const wrapper = mount(ConnectionStatus);
    expect(wrapper.find('.fixed').exists()).toBe(false);
  });
});
