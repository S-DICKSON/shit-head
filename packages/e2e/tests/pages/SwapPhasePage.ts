import { expect } from '@playwright/test';
import type { Page, Locator } from '@playwright/test';

export class SwapPhasePage {
  readonly page: Page;
  readonly faceUpLabel: Locator;
  readonly handLabel: Locator;
  readonly faceDownLabel: Locator;
  readonly readyButton: Locator;
  readonly leaveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.faceUpLabel = page.getByText('Face Up');
    this.handLabel = page.getByText('Your Hand');
    this.faceDownLabel = page.getByText('Face Down');
    this.readyButton = page.getByRole('button', { name: /Ready/i });
    this.leaveButton = page.getByRole('button', { name: 'Leave' });
  }

  async waitForSwapPhase(): Promise<void> {
    await expect(this.faceUpLabel).toBeVisible();
  }

  async getHandCardCount(): Promise<number> {
    // Hand cards are buttons inside the "Your Hand" section
    // SwapPhase.vue renders hand cards as buttons after the "Your Hand" label
    const handSection = this.page.locator('div').filter({ has: this.handLabel });
    return await handSection.locator('button').count();
  }

  async getFaceUpCardCount(): Promise<number> {
    // Face-up cards are buttons inside the "Face Up" section
    const faceUpSection = this.page.locator('div').filter({ has: this.faceUpLabel });
    return await faceUpSection.locator('button').count();
  }
}
