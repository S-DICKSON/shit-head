/**
 * Visual screenshot tests — local only, never run in CI.
 *
 * Captures game screenshots at every configured viewport for 2p, 3p, and 4p lobbies.
 * Used for manual visual verification after frontend layout changes.
 *
 * Run: make screenshots
 * Output: packages/e2e/screenshots/
 */
import { test, type Page } from '@playwright/test';
import { LandingPage } from './pages/LandingPage';
import { GamePage } from './pages/GamePage';

// Skip entirely in CI — these are for local visual verification only
test.skip(!!process.env.CI, 'Screenshots are local-only, skipped in CI');

const allPlayers = [
  { id: 'p1', nickname: 'Player1', isHost: true, isConnected: true },
  { id: 'p2', nickname: 'Player2', isHost: false, isConnected: true },
  { id: 'p3', nickname: 'Player3', isHost: false, isConnected: true },
  { id: 'p4', nickname: 'Player4', isHost: false, isConnected: true },
];

const allOpponents = [
  {
    playerId: 'p2', nickname: 'Player2', handCount: 5,
    faceUp: [
      { kind: 'standard', rank: '9', suit: 'spades' },
      { kind: 'standard', rank: 'J', suit: 'hearts' },
      { kind: 'standard', rank: '4', suit: 'diamonds' },
    ],
    faceDownCount: 3,
  },
  {
    playerId: 'p3', nickname: 'Player3', handCount: 4,
    faceUp: [
      { kind: 'standard', rank: 'Q', suit: 'hearts' },
      { kind: 'standard', rank: '8', suit: 'clubs' },
      { kind: 'standard', rank: '2', suit: 'spades' },
    ],
    faceDownCount: 3,
  },
  {
    playerId: 'p4', nickname: 'Player4', handCount: 6,
    faceUp: [
      { kind: 'standard', rank: '6', suit: 'hearts' },
      { kind: 'standard', rank: 'K', suit: 'clubs' },
      { kind: 'standard', rank: '5', suit: 'diamonds' },
    ],
    faceDownCount: 3,
  },
];

// 7 hand cards triggers the mobile carousel (>5 cards)
const handCards = [
  { kind: 'standard', rank: 'K', suit: 'hearts' },
  { kind: 'standard', rank: '7', suit: 'clubs' },
  { kind: 'standard', rank: 'A', suit: 'spades' },
  { kind: 'standard', rank: '4', suit: 'diamonds' },
  { kind: 'standard', rank: '9', suit: 'hearts' },
  { kind: 'standard', rank: 'J', suit: 'spades' },
  { kind: 'standard', rank: '3', suit: 'clubs' },
];

async function setupGameMock(page: Page, playerCount: number) {
  let mockWs: { send: (msg: string) => void } | null = null;

  await page.routeWebSocket('**/game-ws**', ws => {
    mockWs = ws;
    ws.onMessage(rawMsg => {
      if (rawMsg === 'ping') { ws.send('pong'); return; }
      let msg: { type: string };
      try { msg = JSON.parse(rawMsg as string); } catch { return; }

      if (msg.type === 'create-room') {
        ws.send(JSON.stringify({
          type: 'room-created',
          playerId: 'p1',
          room: {
            code: 'TEST02',
            status: 'playing',
            players: allPlayers.slice(0, playerCount),
            hostId: 'p1',
            minPlayers: 2,
            maxPlayers: 4,
            roundTime: 45,
          },
        }));
      }
    });
  });

  return {
    sendGameDealt: () => {
      mockWs!.send(JSON.stringify({
        type: 'game-dealt',
        phase: 'playing',
        hand: handCards,
        faceUp: [
          { kind: 'standard', rank: '3', suit: 'diamonds' },
          { kind: 'standard', rank: '10', suit: 'hearts' },
          { kind: 'standard', rank: '5', suit: 'clubs' },
        ],
        faceDownCount: 3,
        opponents: allOpponents.slice(0, playerCount - 1),
        drawPileCount: playerCount === 2 ? 24 : playerCount === 3 ? 12 : 6,
        discardPile: [{ kind: 'standard', rank: '6', suit: 'spades' }],
        currentPlayerIndex: 0,
        dealerIndex: 0,
        firstTurn: true,
      }));
    },
  };
}

async function goToGame(page: Page, sendGameDealt: () => void) {
  const landing = new LandingPage(page);
  await landing.goto();
  await landing.waitForConnected();
  await landing.createRoom('Player1');
  await page.waitForURL(/\/#\/room\//, { timeout: 10000 });
  await page.waitForTimeout(100);
  sendGameDealt();
  await page.waitForURL(/\/#\/game/, { timeout: 10000 });
  const gamePage = new GamePage(page);
  await gamePage.waitForGameScreen();
  await page.waitForTimeout(500);
}

for (const players of [2, 3, 4]) {
  test(`${players}p game`, async ({ page }) => {
    const { sendGameDealt } = await setupGameMock(page, players);
    await goToGame(page, sendGameDealt);
    const vp = page.viewportSize()!;
    await page.screenshot({
      path: `screenshots/${players}p-${vp.width}x${vp.height}.png`,
      fullPage: false,
    });
  });
}
