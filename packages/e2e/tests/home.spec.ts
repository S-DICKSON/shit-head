import { test, expect, type Page } from '@playwright/test';
import { LandingPage } from './pages/LandingPage';

// WS mock helper — intercepts the game-ws connection so waitForConnected() succeeds
// without needing a real server. Only handles ping/pong (home tests never create rooms).
async function setupHomeMock(page: Page) {
  await page.routeWebSocket('**/game-ws**', ws => {
    ws.onMessage(rawMsg => {
      if (rawMsg === 'ping') { ws.send('pong'); }
    });
  });
}

test.describe('Home screen', () => {
  test('renders heading and form at all viewports', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();

    await expect(landing.heading).toBeVisible();
    await expect(landing.nicknameInput).toBeVisible();
    await expect(landing.createRoomButton).toBeVisible();
    await expect(landing.joinRoomButton).toBeVisible();
  });

  test('form fits within viewport without horizontal scroll', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('create room button becomes enabled after WS connects', async ({ page }) => {
    await setupHomeMock(page);
    const landing = new LandingPage(page);
    await landing.goto();
    await landing.fillNickname('TestUser');

    // Wait for the Create New Room button to be enabled — confirms WS connection established
    await expect(landing.createRoomButton).toBeEnabled({ timeout: 5000 });
  });

  test('create room button disabled without nickname', async ({ page }) => {
    await setupHomeMock(page);
    const landing = new LandingPage(page);
    await landing.goto();
    await landing.waitForConnected();

    // No nickname entered — button should remain disabled
    await expect(landing.createRoomButton).toBeDisabled();
  });

  test('join room button disabled without room code', async ({ page }) => {
    await setupHomeMock(page);
    const landing = new LandingPage(page);
    await landing.goto();
    await landing.waitForConnected();

    await landing.fillNickname('TestUser');

    // Nickname filled but no room code — Join Room should be disabled
    await expect(landing.joinRoomButton).toBeDisabled();
  });

  test('nickname input accepts up to 20 characters', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();

    // Fill with a 25-character string
    await landing.fillNickname('ABCDEFGHIJKLMNOPQRSTUVWXY');

    // The maxlength="20" attribute truncates input to 20 chars
    const value = await landing.nicknameInput.inputValue();
    expect(value.length).toBeLessThanOrEqual(20);
  });
});
