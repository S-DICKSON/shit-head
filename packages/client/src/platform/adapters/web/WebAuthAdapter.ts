import type { AuthAdapter } from '../../interfaces/AuthAdapter';

/**
 * Web-specific authentication adapter using localStorage.
 *
 * For standalone web mode:
 * - Player identity stored in localStorage
 * - Server assigns playerId on room create/join
 * - No explicit authentication flow needed
 */
export class WebAuthAdapter implements AuthAdapter {
  /**
   * Get the current player from localStorage.
   *
   * @returns Player object if both id and nickname are stored, null otherwise
   */
  async getCurrentUser(): Promise<{ id: string; name: string } | null> {
    const id = localStorage.getItem('shithead-player-id');
    const name = localStorage.getItem('shithead-player-nickname');

    if (!id || !name) {
      return null;
    }

    return { id, name };
  }

  /**
   * No-op for web platform.
   *
   * Authentication happens implicitly when server assigns playerId
   * during room create/join operations.
   */
  async authenticate(): Promise<void> {
    // No explicit auth flow for standalone web
  }

  /**
   * Check if player has a stored ID.
   *
   * @returns true if playerId exists in localStorage
   */
  isAuthenticated(): boolean {
    return localStorage.getItem('shithead-player-id') !== null;
  }

  /**
   * Clear all stored player and room state.
   *
   * Removes:
   * - shithead-player-id
   * - shithead-player-nickname
   * - shithead-room-code
   */
  async signOut(): Promise<void> {
    localStorage.removeItem('shithead-player-id');
    localStorage.removeItem('shithead-player-nickname');
    localStorage.removeItem('shithead-room-code');
  }
}
