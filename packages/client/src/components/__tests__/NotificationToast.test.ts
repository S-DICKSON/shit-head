import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { mount } from '@vue/test-utils';

vi.mock('../../composables/useGameSocket', () => {
  let _cache: any = null;
  const create = () => ({
    notifications: ref<Array<{ id: number; message: string; severity: 'info' | 'warning' | 'success' | 'error'; timestamp: number }>>([]),
    dismissNotification: vi.fn(),
  });
  return { useGameSocket: () => { if (!_cache) _cache = create(); return _cache; } };
});

import { useGameSocket } from '../../composables/useGameSocket';
import NotificationToast from '../NotificationToast.vue';

describe('NotificationToast.vue', () => {
  beforeEach(() => {
    const s = useGameSocket() as any;
    s.notifications.value = [];
    // Reassign a fresh spy so clearMocks config doesn't break it
    s.dismissNotification = vi.fn();
  });

  it('renders nothing when no notifications', () => {
    const wrapper = mount(NotificationToast);
    expect(wrapper.findAll('[class*="rounded-lg"]')).toHaveLength(0);
    expect(wrapper.text()).toBe('');
  });

  it('renders notification messages', () => {
    const s = useGameSocket() as any;
    s.notifications.value = [
      { id: 1, message: 'Player disconnected', severity: 'warning', timestamp: Date.now() },
    ];
    const wrapper = mount(NotificationToast);
    expect(wrapper.text()).toContain('Player disconnected');
  });

  it('renders multiple notifications', () => {
    const s = useGameSocket() as any;
    s.notifications.value = [
      { id: 1, message: 'Player disconnected', severity: 'warning', timestamp: Date.now() },
      { id: 2, message: 'Game started', severity: 'success', timestamp: Date.now() },
    ];
    const wrapper = mount(NotificationToast);
    expect(wrapper.text()).toContain('Player disconnected');
    expect(wrapper.text()).toContain('Game started');
  });

  it('clicking a notification calls dismissNotification with correct id', async () => {
    const s = useGameSocket() as any;
    s.notifications.value = [
      { id: 42, message: 'Some notification', severity: 'info', timestamp: Date.now() },
    ];
    const wrapper = mount(NotificationToast);
    const notification = wrapper.find('[class*="rounded-lg"]');
    await notification.trigger('click');
    expect(s.dismissNotification).toHaveBeenCalledWith(42);
  });

  it('applies correct severity classes', () => {
    const s = useGameSocket() as any;
    s.notifications.value = [
      { id: 1, message: 'Error occurred', severity: 'error', timestamp: Date.now() },
      { id: 2, message: 'All good', severity: 'success', timestamp: Date.now() },
    ];
    const wrapper = mount(NotificationToast);
    const notifications = wrapper.findAll('[class*="rounded-lg"]');
    expect(notifications[0].classes()).toContain('bg-red-600');
    expect(notifications[1].classes()).toContain('bg-green-600');
  });
});
