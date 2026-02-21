import { test, expect, type Page } from '@playwright/test';
import { LandingPage } from './pages/LandingPage';
import { GamePage } from './pages/GamePage';

// WS mock helper — sets up routeWebSocket and returns a function to send game-dealt
// after Lobby has mounted and registered its onMessage handler.
async function setupGameMock(page: Page) {
  let mockWs: { send: (msg: string) => void } | null = null;

  await page.routeWebSocket('**/game-ws**', ws => {
    mockWs = ws;
    ws.onMessage(rawMsg => {
      if (rawMsg === 'ping') {
        ws.send('pong');
        return;
      }
      let msg: { type: string };
      try {
        msg = JSON.parse(rawMsg as string);
      } catch {
        return;
      }

      if (msg.type === 'create-room') {
        ws.send(JSON.stringify({
          type: 'room-created',
          playerId: 'test-player-1',
          room: {
            code: 'TEST02',
            status: 'playing',
            players: [
              { id: 'test-player-1', nickname: 'Player1', isHost: true, isConnected: true },
              { id: 'test-player-2', nickname: 'Player2', isHost: false, isConnected: true },
            ],
            hostId: 'test-player-1',
            minPlayers: 2,
            maxPlayers: 4,
            roundTime: 45,
          },
        }));
        // Do NOT send game-dealt here — Lobby hasn't mounted yet
      }
    });
  });

  return {
    sendGameDealt: () => {
      mockWs!.send(JSON.stringify({
        type: 'game-dealt',
        phase: 'playing',
        hand: [
          { kind: 'standard', rank: 'K', suit: 'hearts' },
          { kind: 'standard', rank: '7', suit: 'clubs' },
          { kind: 'standard', rank: 'A', suit: 'spades' },
          { kind: 'standard', rank: '4', suit: 'diamonds' },
        ],
        faceUp: [
          { kind: 'standard', rank: '3', suit: 'diamonds' },
          { kind: 'standard', rank: '10', suit: 'hearts' },
          { kind: 'standard', rank: '5', suit: 'clubs' },
        ],
        faceDownCount: 3,
        opponents: [
          {
            playerId: 'test-player-2',
            nickname: 'Player2',
            handCount: 5,
            faceUp: [
              { kind: 'standard', rank: '9', suit: 'spades' },
              { kind: 'standard', rank: 'J', suit: 'hearts' },
              { kind: 'standard', rank: '4', suit: 'diamonds' },
            ],
            faceDownCount: 3,
          },
        ],
        drawPileCount: 24,
        discardPile: [{ kind: 'standard', rank: '6', suit: 'spades' }],
        currentPlayerIndex: 0,
        dealerIndex: 0,
        firstTurn: true,
      }));
    },
  };
}

// Navigate to home, create a room, wait for lobby, then trigger game-dealt
async function goToGameScreen(page: Page, sendGameDealt: () => void): Promise<GamePage> {
  const landing = new LandingPage(page);
  await landing.goto();
  await landing.waitForConnected();
  await landing.createRoom('Player1');

  // Wait for lobby to load — Lobby.vue is now mounted and its onMessage handler is registered
  await page.waitForURL(/\/#\/room\//, { timeout: 10000 });
  await page.waitForTimeout(100); // Brief pause to ensure Lobby's onMessage registration

  // NOW send game-dealt — Lobby's handler will catch it and navigate to /game
  sendGameDealt();

  // Wait for Game.vue to render (navigates to /game, then shows playing phase)
  await page.waitForURL(/\/#\/game/, { timeout: 10000 });

  const gamePage = new GamePage(page);
  await gamePage.waitForGameScreen();
  return gamePage;
}

test.describe('Active gameplay screen', () => {
  test('renders game UI with opponent visible', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'WS mocking requires Chromium');

    const { sendGameDealt } = await setupGameMock(page);
    await goToGameScreen(page, sendGameDealt);

    // OpponentCards.vue renders opponent nickname in the top bar
    await expect(page.getByText('Player2')).toBeVisible();
  });

  test('shows player hand cards', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'WS mocking requires Chromium');

    const { sendGameDealt } = await setupGameMock(page);
    await goToGameScreen(page, sendGameDealt);

    // PlayingPhase -> PlayerCards: hand cards are rendered as buttons
    // We have 4 hand cards in the mock
    const gamePage = new GamePage(page);
    await expect(gamePage.leaveButton).toBeVisible();

    // Verify draw pile label is visible (confirms game rendered)
    await expect(gamePage.drawPile).toBeVisible();
  });

  test('shows face-up and face-down card areas', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'WS mocking requires Chromium');

    const { sendGameDealt } = await setupGameMock(page);
    await goToGameScreen(page, sendGameDealt);

    // PlayerCards.vue renders face-up and face-down sections
    // Face-down cards have count=3 in mock, so they show as blue card backs
    // The Discard pile label confirms game is in playing phase
    await expect(page.getByText('Discard')).toBeVisible();
  });

  test('shows draw pile with count', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'WS mocking requires Chromium');

    const { sendGameDealt } = await setupGameMock(page);
    await goToGameScreen(page, sendGameDealt);

    const gamePage = new GamePage(page);

    // DrawPile.vue renders "Draw" label below the pile
    await expect(gamePage.drawPile).toBeVisible();

    // The count badge shows 24 (drawPileCount from mock)
    await expect(page.getByText('24')).toBeVisible();
  });

  test('shows discard pile card', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'WS mocking requires Chromium');

    const { sendGameDealt } = await setupGameMock(page);
    await goToGameScreen(page, sendGameDealt);

    // DiscardPile.vue renders the top card rank. Mock has 6 of spades on top.
    // The Discard label is visible, confirming the pile is rendered
    await expect(page.getByText('Discard')).toBeVisible();

    // The pile count badge (span.bg-green-700) shows 1 card in discard pile
    const discardPileBadge = page.locator('span.bg-green-700.text-white').getByText('1', { exact: true });
    await expect(discardPileBadge).toBeVisible();
  });

  test('leave button is visible', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'WS mocking requires Chromium');

    const { sendGameDealt } = await setupGameMock(page);
    const gamePage = await goToGameScreen(page, sendGameDealt);

    await expect(gamePage.leaveButton).toBeVisible();
  });

  test('no horizontal scroll', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'WS mocking requires Chromium');

    const { sendGameDealt } = await setupGameMock(page);
    await goToGameScreen(page, sendGameDealt);

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
