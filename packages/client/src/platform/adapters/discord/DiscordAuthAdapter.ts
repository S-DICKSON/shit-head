import { DiscordSDK } from '@discord/embedded-app-sdk';
import type { AuthAdapter } from '../../interfaces/AuthAdapter';

interface DiscordUser {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
}

/**
 * Generate a random code verifier for PKCE (43-128 chars, URL-safe).
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generate SHA-256 code challenge from verifier (S256 method).
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Discord auth adapter using PKCE OAuth2 flow via the Embedded App SDK.
 *
 * Uses code_challenge/code_verifier instead of redirect_uri,
 * which is the correct flow for Activities running in Discord's iframe.
 */
export class DiscordAuthAdapter implements AuthAdapter {
  private sdk: DiscordSDK;
  private user: { id: string; name: string } | null = null;
  private rawDiscordUser: DiscordUser | null = null;

  constructor(clientId: string) {
    this.sdk = new DiscordSDK(clientId);
  }

  async authenticate(): Promise<void> {
    // Step 1: Handshake with Discord client
    await this.sdk.ready();

    // Step 2: Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Step 3: Authorize with PKCE challenge (SDK handles redirect internally)
    const { code } = await this.sdk.commands.authorize({
      client_id: this.sdk.clientId,
      response_type: 'code',
      state: '',
      prompt: 'none',
      scope: ['identify'],
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    // Step 4: Exchange code for token via server (with code_verifier)
    const response = await fetch('/.proxy/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, code_verifier: codeVerifier }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => 'Unknown error');
      throw new Error(`Token exchange failed (${response.status}): ${error}`);
    }

    const { access_token } = (await response.json()) as { access_token: string };

    // Step 5: Authenticate SDK with access token
    const auth = await this.sdk.commands.authenticate({ access_token });

    this.rawDiscordUser = {
      id: auth.user.id,
      username: auth.user.username,
      global_name: auth.user.global_name ?? null,
      avatar: auth.user.avatar ?? null,
    };

    this.user = {
      id: auth.user.id,
      name: auth.user.global_name || auth.user.username,
    };
  }

  async getCurrentUser(): Promise<{ id: string; name: string } | null> {
    return this.user;
  }

  isAuthenticated(): boolean {
    return this.user !== null;
  }

  async signOut(): Promise<void> {
    this.user = null;
    this.rawDiscordUser = null;
  }

  getDiscordUser(): DiscordUser | null {
    return this.rawDiscordUser;
  }

  getSdk(): DiscordSDK {
    return this.sdk;
  }
}
