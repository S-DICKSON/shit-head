import { test, expect, type Page } from '@playwright/test';
import { LandingPage } from './pages/LandingPage';
import { SwapPhasePage } from './pages/SwapPhasePage';

// WS mock helper — sets up routeWebSocket and returns a function to send game-dealt
// after Lobby has mounted and registered its onMessage handler.
async function setupSwapPhaseMock(page: Page) {
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
            code: 'TEST01',
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
        phase: 'swapping',
        hand: [
          { kind: 'standard', rank: 'K', suit: 'hearts' },
          { kind: 'standard', rank: '7', suit: 'clubs' },
          { kind: 'standard', rank: 'A', suit: 'spades' },
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
            handCount: 3,
            faceUp: [
              { kind: 'standard', rank: '9', suit: 'spades' },
              { kind: 'standard', rank: 'J', suit: 'hearts' },
              { kind: 'standard', rank: '4', suit: 'diamonds' },
            ],
            faceDownCount: 3,
          },
        ],
        drawPileCount: 30,
        discardPile: [],
        currentPlayerIndex: 0,
        dealerIndex: 0,
        firstTurn: false,
      }));
    },
  };
}

// Navigate to home, create a room, wait for lobby, then trigger game-dealt
async function goToSwapPhase(page: Page, sendGameDealt: () => void): Promise<SwapPhasePage> {
  const landing = new LandingPage(page);
  await landing.goto();
  await landing.waitForConnected();
  await landing.createRoom('Player1');

  // Wait for lobby to load — Lobby.vue is now mounted and its onMessage handler is registered
  await page.waitForURL(/\/#\/room\//, { timeout: 10000 });
  await page.waitForTimeout(100); // Brief pause to ensure Lobby's onMessage registration

  // NOW send game-dealt — Lobby's handler will catch it and navigate to /game
  sendGameDealt();

  // Wait for Game.vue to render (navigates to /game, then shows swap phase)
  await page.waitForURL(/\/#\/game/, { timeout: 10000 });

  const swapPhase = new SwapPhasePage(page);
  await swapPhase.waitForSwapPhase();
  return swapPhase;
}

test.describe('Swap phase screen', () => {
  test('renders swap phase UI', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'WS mocking requires Chromium');

    const { sendGameDealt } = await setupSwapPhaseMock(page);
    const swapPhase = await goToSwapPhase(page, sendGameDealt);

    await expect(swapPhase.faceUpLabel).toBeVisible();
    await expect(swapPhase.handLabel).toBeVisible();
    await expect(swapPhase.faceDownLabel).toBeVisible();
    await expect(swapPhase.readyButton).toBeVisible();
  });

  test('shows correct card counts', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'WS mocking requires Chromium');

    const { sendGameDealt } = await setupSwapPhaseMock(page);
    await goToSwapPhase(page, sendGameDealt);

    // SwapPhase.vue renders player card buttons with bg-white text-black rounded border-2
    // These are the face-up cards (3) + hand cards (3) = 6 interactive card buttons for the player
    // (Opponent face-up cards are non-interactive divs; face-down cards are also non-interactive divs)
    const playerCardButtons = await page.locator('button.bg-white.text-black.rounded').count();
    expect(playerCardButtons).toBe(6); // 3 hand + 3 face-up

    // Face-down cards are non-interactive divs with bg-blue-800 class
    const faceDownCards = await page.locator('div.bg-blue-800.rounded').count();
    expect(faceDownCards).toBe(3);
  });

  test('ready button is interactive', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'WS mocking requires Chromium');

    const { sendGameDealt } = await setupSwapPhaseMock(page);
    const swapPhase = await goToSwapPhase(page, sendGameDealt);

    await expect(swapPhase.readyButton).not.toBeDisabled();
  });

  test('leave button is visible', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'WS mocking requires Chromium');

    const { sendGameDealt } = await setupSwapPhaseMock(page);
    const swapPhase = await goToSwapPhase(page, sendGameDealt);

    await expect(swapPhase.leaveButton).toBeVisible();
  });

  test('no horizontal scroll', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'WS mocking requires Chromium');

    const { sendGameDealt } = await setupSwapPhaseMock(page);
    await goToSwapPhase(page, sendGameDealt);

    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('opponent section visible', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'WS mocking requires Chromium');

    const { sendGameDealt } = await setupSwapPhaseMock(page);
    await goToSwapPhase(page, sendGameDealt);

    // SwapPhase.vue renders each opponent's nickname
    await expect(page.getByText('Player2')).toBeVisible();
  });
});
