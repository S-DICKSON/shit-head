import { DiscordSDK } from '@discord/embedded-app-sdk';
import type { AuthAdapter } from '../../interfaces/AuthAdapter';

/**
 * Raw Discord user object returned by the SDK after authentication.
 */
interface DiscordUser {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
}

/**
 * Discord-specific authentication adapter using the Discord Embedded App SDK.
 *
 * Implements the 4-step OAuth2 flow required for Discord Activities:
 * 1. SDK ready handshake with Discord client
 * 2. Authorization code request (identify scope)
 * 3. Token exchange via our server's /.proxy/api/token endpoint
 * 4. SDK authentication with the access token
 *
 * The access token is kept in memory only — never stored in localStorage.
 * After authentication, getCurrentUser() returns {id, name} for Phase 19 UI consumption.
 */
export class DiscordAuthAdapter implements AuthAdapter {
  private sdk: DiscordSDK;
  private user: { id: string; name: string } | null = null;
  private rawDiscordUser: DiscordUser | null = null;

  /**
   * @param clientId - Discord application client ID (from VITE_DISCORD_CLIENT_ID)
   */
  constructor(clientId: string) {
    this.sdk = new DiscordSDK(clientId);
  }

  /**
   * Implement the 4-step Discord Activity OAuth2 flow.
   *
   * Step 1: Handshake with Discord client (ready)
   * Step 2: Request authorization code with 'identify' scope
   * Step 3: Exchange code for access token via our server
   * Step 4: Authenticate SDK with access token, store user identity
   *
   * Uses prompt: 'none' for seamless UX (no consent dialog for identify scope).
   *
   * @throws Error if any step of the OAuth2 flow fails
   */
  async authenticate(): Promise<void> {
    // Step 1: Handshake with Discord client
    await this.sdk.ready();

    // Step 2: Request authorization code
    const { code } = await this.sdk.commands.authorize({
      client_id: this.sdk.clientId,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: ['identify'],
    });

    // Step 3: Exchange code for access token via our server
    const response = await fetch('/.proxy/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error');
      throw new Error(`Token exchange failed (${response.status}): ${error}`);
    }

    const { access_token } = (await response.json()) as { access_token: string };

    // Step 4: Authenticate SDK with access token
    const auth = await this.sdk.commands.authenticate({ access_token });

    // Store raw Discord user for avatar display etc.
    this.rawDiscordUser = {
      id: auth.user.id,
      username: auth.user.username,
      global_name: auth.user.global_name ?? null,
      avatar: auth.user.avatar ?? null,
    };

    // Store normalized user identity — name prefers global_name (display name) over username
    this.user = {
      id: auth.user.id,
      name: auth.user.global_name || auth.user.username,
    };
  }

  /**
   * Get the currently authenticated user.
   *
   * Primary API for consuming Discord identity in Phase 19.
   * Phase 19 UI uses getCurrentUser().name to auto-populate player nickname.
   *
   * @returns User object with id and name, or null if not authenticated
   */
  async getCurrentUser(): Promise<{ id: string; name: string } | null> {
    return this.user;
  }

  /**
   * Check if user is currently authenticated.
   *
   * @returns true if authenticated, false otherwise
   */
  isAuthenticated(): boolean {
    return this.user !== null;
  }

  /**
   * Sign out and clear all authentication state.
   *
   * Clears in-memory user and raw Discord user data.
   * Note: Does not revoke the Discord access token (SDK doesn't support revocation).
   */
  async signOut(): Promise<void> {
    this.user = null;
    this.rawDiscordUser = null;
  }

  /**
   * Get the raw Discord user object (Discord-specific, not in AuthAdapter interface).
   *
   * Provides access to Discord-specific fields like avatar hash for
   * constructing CDN avatar URLs.
   *
   * @returns Raw Discord user or null if not authenticated
   */
  getDiscordUser(): DiscordUser | null {
    return this.rawDiscordUser;
  }

  /**
   * Get the DiscordSDK instance (Discord-specific, not in AuthAdapter interface).
   *
   * Needed by other Discord adapters or future phases for event subscriptions
   * (e.g., ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE in Phase 19).
   *
   * @returns The DiscordSDK instance
   */
  getSdk(): DiscordSDK {
    return this.sdk;
  }
}
