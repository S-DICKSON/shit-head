import { expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';

export class LandingPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly nicknameInput: Locator;
  readonly roomCodeInput: Locator;
  readonly createRoomButton: Locator;
  readonly joinRoomButton: Locator;
  readonly connectionStatus: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Karma' });
    this.nicknameInput = page.getByLabel('Your Nickname');
    this.roomCodeInput = page.getByPlaceholder('ABC123');
    this.createRoomButton = page.getByRole('button', { name: /Create New Room/i });
    this.joinRoomButton = page.getByRole('button', { name: /Join Room/i });
    this.connectionStatus = page.getByText('Connecting to server...');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  /**
   * Wait until the WebSocket connection is open.
   * Fills a nickname temporarily so the Create New Room button becomes enabled
   * once the connection is established (canCreate = nickname.length > 0 && isConnected).
   * Uses Playwright's expect assertion exclusively (no page.waitForFunction).
   */
  async waitForConnected(): Promise<void> {
    await this.nicknameInput.fill('test');
    await expect(this.createRoomButton).toBeEnabled({ timeout: 5000 });
    await this.nicknameInput.fill('');
  }

  async fillNickname(name: string): Promise<void> {
    await this.nicknameInput.fill(name);
  }

  async createRoom(nickname: string): Promise<void> {
    await this.fillNickname(nickname);
    await this.createRoomButton.click();
  }

  async joinRoom(nickname: string, code: string): Promise<void> {
    await this.fillNickname(nickname);
    await this.roomCodeInput.fill(code);
    await this.joinRoomButton.click();
  }
}
