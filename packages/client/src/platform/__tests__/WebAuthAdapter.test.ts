import { describe, it, expect, beforeEach } from 'vitest'
import { WebAuthAdapter } from '../adapters/web/WebAuthAdapter'

describe('WebAuthAdapter', () => {
  let adapter: WebAuthAdapter

  beforeEach(() => {
    // jsdom provides in-memory localStorage — clear it between tests
    localStorage.clear()
    adapter = new WebAuthAdapter()
  })

  describe('getCurrentUser()', () => {
    it('returns null when nothing is stored in localStorage', async () => {
      const user = await adapter.getCurrentUser()
      expect(user).toBeNull()
    })

    it('returns user object when both player-id and player-nickname are stored', async () => {
      localStorage.setItem('shithead-player-id', 'player-abc-123')
      localStorage.setItem('shithead-player-nickname', 'Alice')

      const user = await adapter.getCurrentUser()

      expect(user).not.toBeNull()
      expect(user!.id).toBe('player-abc-123')
      expect(user!.name).toBe('Alice')
    })

    it('returns null when only player-id is stored (nickname missing)', async () => {
      localStorage.setItem('shithead-player-id', 'player-abc-123')
      // shithead-player-nickname is NOT set

      const user = await adapter.getCurrentUser()
      expect(user).toBeNull()
    })

    it('returns null when only player-nickname is stored (id missing)', async () => {
      localStorage.setItem('shithead-player-nickname', 'Alice')
      // shithead-player-id is NOT set

      const user = await adapter.getCurrentUser()
      expect(user).toBeNull()
    })
  })

  describe('isAuthenticated()', () => {
    it('returns false when no playerId is stored in localStorage', () => {
      expect(adapter.isAuthenticated()).toBe(false)
    })

    it('returns true when playerId exists in localStorage', () => {
      localStorage.setItem('shithead-player-id', 'player-abc-123')
      expect(adapter.isAuthenticated()).toBe(true)
    })
  })

  describe('authenticate()', () => {
    it('is a no-op and does not throw', async () => {
      await expect(adapter.authenticate()).resolves.toBeUndefined()
    })
  })

  describe('signOut()', () => {
    it('clears all shithead-prefixed keys from localStorage', async () => {
      // Set up all three stored values
      localStorage.setItem('shithead-player-id', 'player-abc-123')
      localStorage.setItem('shithead-player-nickname', 'Alice')
      localStorage.setItem('shithead-room-code', 'ABCDE')

      await adapter.signOut()

      expect(localStorage.getItem('shithead-player-id')).toBeNull()
      expect(localStorage.getItem('shithead-player-nickname')).toBeNull()
      expect(localStorage.getItem('shithead-room-code')).toBeNull()
    })

    it('does not throw when localStorage is already empty', async () => {
      await expect(adapter.signOut()).resolves.toBeUndefined()
    })

    it('removes only the three shithead keys, leaving other keys intact', async () => {
      localStorage.setItem('shithead-player-id', 'player-abc-123')
      localStorage.setItem('other-app-key', 'preserved-value')

      await adapter.signOut()

      expect(localStorage.getItem('shithead-player-id')).toBeNull()
      expect(localStorage.getItem('other-app-key')).toBe('preserved-value')
    })
  })
})
