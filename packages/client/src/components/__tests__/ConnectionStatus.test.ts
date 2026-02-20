import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { render, screen, fireEvent } from '@testing-library/vue';

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
    // Reassign a fresh spy so clearMocks config doesn't break it
    s.retryConnection = vi.fn();
  });

  it('does not render overlay when connected', () => {
    const s = useGameSocket() as any;
    s.connectionState.value = 'connected';
    render(ConnectionStatus);
    expect(screen.queryByText('Reconnecting...')).not.toBeInTheDocument();
    expect(screen.queryByText('Connection Failed')).not.toBeInTheDocument();
  });

  it('shows reconnecting spinner when connectionState is reconnecting', () => {
    const s = useGameSocket() as any;
    s.connectionState.value = 'reconnecting';
    render(ConnectionStatus);
    expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
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
    render(ConnectionStatus);
    expect(screen.getByText('Connection Failed')).toBeInTheDocument();
    expect(screen.getByText('Server unreachable')).toBeInTheDocument();
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
    render(ConnectionStatus);
    const button = screen.getByRole('button', { name: /Retry/ });
    expect(button).toBeInTheDocument();
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
    render(ConnectionStatus);
    const button = screen.getByRole('button', { name: /Retry/ });
    await fireEvent.click(button);
    expect(s.retryConnection).toHaveBeenCalledOnce();
  });

  it('does not render overlay when connecting', () => {
    const s = useGameSocket() as any;
    s.connectionState.value = 'connecting';
    render(ConnectionStatus);
    expect(screen.queryByText('Reconnecting...')).not.toBeInTheDocument();
    expect(screen.queryByText('Connection Failed')).not.toBeInTheDocument();
  });
});
