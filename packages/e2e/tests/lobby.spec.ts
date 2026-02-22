import { test, expect, type Page } from '@playwright/test';
import { LandingPage } from './pages/LandingPage';
import { LobbyPage } from './pages/LobbyPage';

// WS mock helper — intercepts the game-ws connection and handles ping/pong and create-room.
// Returns a room-created response with status 'waiting' (lobby, not playing).
// The nickname from the create-room message is echoed back in the response.
async function setupLobbyMock(page: Page) {
  await page.routeWebSocket('**/game-ws**', ws => {
    ws.onMessage(rawMsg => {
      if (rawMsg === 'ping') { ws.send('pong'); return; }
      let msg: { type: string; nickname?: string };
      try { msg = JSON.parse(rawMsg as string); } catch { return; }

      if (msg.type === 'create-room') {
        ws.send(JSON.stringify({
          type: 'room-created',
          playerId: 'test-player-1',
          room: {
            code: 'TEST00',
            status: 'waiting',
            players: [
              { id: 'test-player-1', nickname: msg.nickname || 'Player1', isHost: true, isConnected: true },
            ],
            hostId: 'test-player-1',
            minPlayers: 2,
            maxPlayers: 4,
            roundTime: 45,
          },
        }));
      }
    });
  });
}

test.describe('Lobby screen', () => {
  test('create room navigates to lobby', async ({ page }) => {
    await setupLobbyMock(page);
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
    await setupLobbyMock(page);
    const landing = new LandingPage(page);
    await landing.goto();
    await landing.waitForConnected();
    await landing.createRoom('LobbyTester');

    await page.waitForURL(/\/#\/room\//, { timeout: 10000 });

    await expect(page.getByText('LobbyTester')).toBeVisible();
  });

  test('lobby shows room code', async ({ page }) => {
    await setupLobbyMock(page);
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
    await setupLobbyMock(page);
    const landing = new LandingPage(page);
    await landing.goto();
    await landing.waitForConnected();
    await landing.createRoom('LeaveTest');

    await page.waitForURL(/\/#\/room\//, { timeout: 10000 });

    const lobby = new LobbyPage(page);
    await expect(lobby.leaveButton).toBeVisible();
  });

  test('lobby fits within viewport', async ({ page }) => {
    await setupLobbyMock(page);
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
    await setupLobbyMock(page);
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
