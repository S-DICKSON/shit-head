import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { render, screen } from '@testing-library/vue';

vi.mock('../../composables/useSoundEffects', () => {
  let _cache: any = null;
  const create = () => ({
    muteState: ref(false),
    toggleMute: () => {},
  });
  return { useSoundEffects: () => { if (!_cache) _cache = create(); return _cache; } };
});

import { useSoundEffects } from '../../composables/useSoundEffects';
import MuteButton from '../MuteButton.vue';

describe('MuteButton.vue', () => {
  beforeEach(() => {
    const s = useSoundEffects() as any;
    s.muteState.value = false;
  });

  it('has accessible aria-label when unmuted', () => {
    render(MuteButton);
    const button = screen.getByRole('button', { name: 'Mute sounds' });
    expect(button).toBeInTheDocument();
  });

  it('has accessible aria-label when muted', () => {
    const s = useSoundEffects() as any;
    s.muteState.value = true;
    render(MuteButton);
    const button = screen.getByRole('button', { name: 'Unmute sounds' });
    expect(button).toBeInTheDocument();
  });

  it('has title attribute for tooltip', () => {
    render(MuteButton);
    const button = screen.getByRole('button');
    expect(button.getAttribute('title')).toBe('Mute sounds');
  });

  it('hides emoji from screen readers with aria-hidden', () => {
    render(MuteButton);
    const button = screen.getByRole('button');
    const spans = button.querySelectorAll('span');
    expect(spans.length).toBeGreaterThan(0);
    spans.forEach(span => {
      expect(span.getAttribute('aria-hidden')).toBe('true');
    });
  });
});
