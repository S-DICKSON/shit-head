/**
 * Platform-agnostic authentication interface.
 *
 * Implementations:
 * - Web: localStorage-based player identity
 * - Discord: Discord SDK user authentication
 */
export interface AuthAdapter {
  /**
   * Get the currently authenticated user.
   *
   * @returns User object with id and name, or null if not authenticated
   */
  getCurrentUser(): Promise<{ id: string; name: string } | null>;

  /**
   * Trigger authentication flow.
   *
   * - Web: no-op (server assigns playerId on room create/join)
   * - Discord: initiate Discord SDK authentication
   *
   * @throws Error if authentication fails
   */
  authenticate(): Promise<void>;

  /**
   * Check if user is currently authenticated.
   *
   * @returns true if authenticated, false otherwise
   */
  isAuthenticated(): boolean;

  /**
   * Sign out and clear authentication state.
   *
   * Clears stored credentials and player identity.
   */
  signOut(): Promise<void>;
}
