import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { render, screen, fireEvent } from '@testing-library/vue';

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
    const { container } = render(NotificationToast);
    expect(container.textContent).toBe('');
  });

  it('renders notification messages', () => {
    const s = useGameSocket() as any;
    s.notifications.value = [
      { id: 1, message: 'Player disconnected', severity: 'warning', timestamp: Date.now() },
    ];
    render(NotificationToast);
    expect(screen.getByText('Player disconnected')).toBeInTheDocument();
  });

  it('renders multiple notifications', () => {
    const s = useGameSocket() as any;
    s.notifications.value = [
      { id: 1, message: 'Player disconnected', severity: 'warning', timestamp: Date.now() },
      { id: 2, message: 'Game started', severity: 'success', timestamp: Date.now() },
    ];
    render(NotificationToast);
    expect(screen.getByText('Player disconnected')).toBeInTheDocument();
    expect(screen.getByText('Game started')).toBeInTheDocument();
  });

  it('clicking a notification calls dismissNotification with correct id', async () => {
    const s = useGameSocket() as any;
    s.notifications.value = [
      { id: 42, message: 'Some notification', severity: 'info', timestamp: Date.now() },
    ];
    render(NotificationToast);
    await fireEvent.click(screen.getByText('Some notification'));
    expect(s.dismissNotification).toHaveBeenCalledWith(42);
  });

  it('applies correct severity classes', () => {
    const s = useGameSocket() as any;
    s.notifications.value = [
      { id: 1, message: 'Error occurred', severity: 'error', timestamp: Date.now() },
      { id: 2, message: 'All good', severity: 'success', timestamp: Date.now() },
    ];
    render(NotificationToast);
    expect(screen.getByText('Error occurred').classList.contains('bg-red-600')).toBe(true);
    expect(screen.getByText('All good').classList.contains('bg-green-600')).toBe(true);
  });
});
