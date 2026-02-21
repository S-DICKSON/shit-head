import { expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';

export class GamePage {
  readonly page: Page;
  readonly leaveButton: Locator;
  readonly turnBanner: Locator;
  readonly drawPile: Locator;
  readonly gameOverHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    // PlayingPhase.vue: fixed top-left Leave button with aria-label="Leave game"
    this.leaveButton = page.getByRole('button', { name: 'Leave' });
    // TurnBanner.vue: displays "YOUR TURN" text when it's the player's turn
    this.turnBanner = page.getByText('YOUR TURN');
    // DrawPile.vue: has a "Draw" label below the pile
    this.drawPile = page.getByText('Draw');
    this.gameOverHeading = page.getByText('Game Over');
  }

  async waitForGameScreen(): Promise<void> {
    await expect(this.leaveButton).toBeVisible();
  }

  async isOpponentVisible(): Promise<boolean> {
    // OpponentCards.vue renders opponent card areas — check if any exist
    const opponentAreas = this.page.locator('[class*="opponent"]').or(
      this.page.locator('div').filter({ hasText: /opponent/i })
    );
    return await opponentAreas.count() > 0;
  }
}
