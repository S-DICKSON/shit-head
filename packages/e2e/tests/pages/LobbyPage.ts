import { expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';

export class LobbyPage {
  readonly page: Page;
  readonly playersHeading: Locator;
  readonly leaveButton: Locator;
  readonly startGameButton: Locator;
  readonly waitingMessage: Locator;
  readonly roomCodeDisplay: Locator;

  constructor(page: Page) {
    this.page = page;
    this.playersHeading = page.getByRole('heading', { name: /Players/i });
    this.leaveButton = page.getByText('Leave Room');
    this.startGameButton = page.getByRole('button', { name: /Start Game/i });
    this.waitingMessage = page.getByText('Waiting for host to start...');
    this.roomCodeDisplay = page.locator('[data-testid="room-code"]');
  }

  async waitForLobby(): Promise<void> {
    await expect(this.playersHeading).toBeVisible();
  }

  async getPlayerNames(): Promise<string[]> {
    const playerItems = this.page.locator('.divide-y > div span.text-gray-800');
    const count = await playerItems.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await playerItems.nth(i).textContent();
      if (text) names.push(text.trim());
    }
    return names;
  }

  async getPlayerCount(): Promise<number> {
    const headingText = await this.playersHeading.textContent();
    if (!headingText) return 0;
    // Heading text is like "Players 1/4" — extract current count
    const match = headingText.match(/Players\s+(\d+)\/\d+/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
