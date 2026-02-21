import { test, expect } from '@playwright/test';
import { LandingPage } from './pages/LandingPage';
import { LobbyPage } from './pages/LobbyPage';

test.describe('Lobby screen', () => {
  test('create room navigates to lobby', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await landing.waitForConnected();
    await landing.createRoom('Player1');

    // Hash-based routing: wait for URL to contain /#/room/
    await page.waitForURL(/\/#\/room\//, { timeout: 10000 });

    const lobby = new LobbyPage(page);
    await expect(lobby.playersHeading).toBeVisible();
  });

  test('lobby shows player name', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await landing.waitForConnected();
    await landing.createRoom('LobbyTester');

    await page.waitForURL(/\/#\/room\//, { timeout: 10000 });

    await expect(page.getByText('LobbyTester')).toBeVisible();
  });

  test('lobby shows room code', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await landing.waitForConnected();
    await landing.createRoom('CodeCheck');

    await page.waitForURL(/\/#\/room\//, { timeout: 10000 });

    const lobby = new LobbyPage(page);
    // Room code is a 6-character alphanumeric string in the [data-testid="room-code"] element
    await expect(lobby.roomCodeDisplay).toBeVisible();
    const codeText = await lobby.roomCodeDisplay.textContent();
    expect(codeText?.trim()).toMatch(/^[A-Z0-9]{6}$/);
  });

  test('leave button is visible', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await landing.waitForConnected();
    await landing.createRoom('LeaveTest');

    await page.waitForURL(/\/#\/room\//, { timeout: 10000 });

    const lobby = new LobbyPage(page);
    await expect(lobby.leaveButton).toBeVisible();
  });

  test('lobby fits within viewport', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await landing.waitForConnected();
    await landing.createRoom('LayoutTest');

    await page.waitForURL(/\/#\/room\//, { timeout: 10000 });

    const lobby = new LobbyPage(page);
    await lobby.waitForLobby();

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('host sees waiting for players button when alone', async ({ page }) => {
    const landing = new LandingPage(page);
    await landing.goto();
    await landing.waitForConnected();
    await landing.createRoom('HostTest');

    await page.waitForURL(/\/#\/room\//, { timeout: 10000 });

    // As the only player (host), the Start Game button shows "Waiting for players..."
    // because minPlayers (2) is not met
    await expect(page.getByText('Waiting for players...')).toBeVisible();
  });
});
