import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/vue';
import OpponentCards from '../OpponentCards.vue';

function makeOpponent(overrides: any = {}) {
  return {
    playerId: 'p1',
    nickname: 'Alice',
    handCount: 3,
    faceDownCount: 3,
    faceUp: [],
    isShithead: false,
    discordUserId: null,
    avatarHash: null,
    ...overrides,
  };
}

describe('OpponentCards.vue', () => {
  it('renders opponent nickname', () => {
    render(OpponentCards, {
      props: { opponent: makeOpponent(), isCurrentTurn: false },
    });
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('shows title tooltip on truncated nickname', () => {
    render(OpponentCards, {
      props: { opponent: makeOpponent({ nickname: 'VeryLongPlayerName123' }), isCurrentTurn: false },
    });
    const nicknameEl = screen.getByText('VeryLongPlayerName123');
    expect(nicknameEl.getAttribute('title')).toBe('VeryLongPlayerName123');
  });

  it('renders shithead emoji with ARIA label', () => {
    render(OpponentCards, {
      props: { opponent: makeOpponent({ isShithead: true }), isCurrentTurn: false },
    });
    const emoji = screen.getByRole('img', { name: 'Lost last game' });
    expect(emoji).toBeInTheDocument();
  });

  it('does not render shithead emoji when player is not shithead', () => {
    render(OpponentCards, {
      props: { opponent: makeOpponent({ isShithead: false }), isCurrentTurn: false },
    });
    expect(screen.queryByRole('img', { name: 'Lost last game' })).not.toBeInTheDocument();
  });

  it('highlights current turn opponent', () => {
    const { container } = render(OpponentCards, {
      props: { opponent: makeOpponent(), isCurrentTurn: true },
    });
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.classList.contains('ring-2')).toBe(true);
  });

  it('shows hand and face-down counts', () => {
    render(OpponentCards, {
      props: { opponent: makeOpponent({ handCount: 5, faceDownCount: 2 }), isCurrentTurn: false },
    });
    expect(screen.getByText('Hand: 5')).toBeInTheDocument();
    expect(screen.getByText('Down: 2')).toBeInTheDocument();
  });

  it('shows discord avatar with fallback background color', () => {
    render(OpponentCards, {
      props: {
        opponent: makeOpponent({ discordUserId: '12345', avatarHash: 'abc123' }),
        isCurrentTurn: false,
      },
    });
    const img = screen.getByAltText('Alice') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.classList.contains('bg-gray-400')).toBe(true);
  });
});
