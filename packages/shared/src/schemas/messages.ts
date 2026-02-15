// Zod validation schemas for WebSocket messages
import * as z from 'zod';
import type { RoomState } from '../types/room';
import type { OpponentView } from '../types/game';

// Room state schema (for nested validation)
const lobbyPlayerSchema = z.object({
  id: z.string(),
  nickname: z.string(),
  isHost: z.boolean(),
});

const roomStateSchema: z.ZodType<RoomState> = z.object({
  code: z.string().length(6),
  players: z.array(lobbyPlayerSchema),
  status: z.enum(['waiting', 'countdown', 'playing']),
  hostId: z.string(),
  maxPlayers: z.literal(4),
  minPlayers: z.literal(2),
});

// Card schemas (Phase 3: Deck & Dealing)
const suitSchema = z.enum(['hearts', 'diamonds', 'clubs', 'spades']);
const rankSchema = z.enum(['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']);

const standardCardSchema = z.object({
  kind: z.literal('standard'),
  suit: suitSchema,
  rank: rankSchema,
});

const jokerCardSchema = z.object({
  kind: z.literal('joker'),
  id: z.union([z.literal(1), z.literal(2)]),
});

const cardSchema = z.discriminatedUnion('kind', [
  standardCardSchema,
  jokerCardSchema,
]);

// Opponent view schema (what a player sees of opponents)
const opponentViewSchema: z.ZodType<OpponentView> = z.object({
  playerId: z.string(),
  nickname: z.string(),
  faceDownCount: z.number(),
  faceUp: z.array(cardSchema),
  handCount: z.number(),
});

// Client-to-server message schemas
export const createRoomSchema = z.object({
  type: z.literal('create-room'),
  nickname: z.string().min(1).max(20).trim(),
});

export const joinRoomSchema = z.object({
  type: z.literal('join-room'),
  code: z.string().length(6),
  nickname: z.string().min(1).max(20).trim(),
});

export const leaveRoomSchema = z.object({
  type: z.literal('leave-room'),
});

export const startGameSchema = z.object({
  type: z.literal('start-game'),
});

export const swapCardsSchema = z.object({
  type: z.literal('swap-cards'),
  handIndex: z.number().int().min(0).max(2),
  faceUpIndex: z.number().int().min(0).max(2),
});

export const readyUpSchema = z.object({
  type: z.literal('ready-up'),
});

export const playCardsSchema = z.object({
  type: z.literal('play-cards'),
  cardIndices: z.array(z.number().int().min(0)).min(1),
});

export const pickupPileSchema = z.object({
  type: z.literal('pickup-pile'),
});

export const playFaceDownSchema = z.object({
  type: z.literal('play-face-down'),
  faceDownIndex: z.number().int().min(0),
});

export const reconnectSchema = z.object({
  type: z.literal('reconnect'),
  roomCode: z.string().length(6),
});

export const renamePlayerSchema = z.object({
  type: z.literal('rename-player'),
  nickname: z.string().min(1).max(20).trim(),
});

export const playAgainSchema = z.object({
  type: z.literal('play-again'),
});

export const clientMessageSchema = z.discriminatedUnion('type', [
  createRoomSchema,
  joinRoomSchema,
  leaveRoomSchema,
  startGameSchema,
  swapCardsSchema,
  readyUpSchema,
  playCardsSchema,
  pickupPileSchema,
  playFaceDownSchema,
  reconnectSchema,
  renamePlayerSchema,
  playAgainSchema,
]);

// Server-to-client message schemas
export const roomCreatedSchema = z.object({
  type: z.literal('room-created'),
  room: roomStateSchema,
  playerId: z.string(),
});

export const roomJoinedSchema = z.object({
  type: z.literal('room-joined'),
  room: roomStateSchema,
  playerId: z.string(),
});

export const roomUpdatedSchema = z.object({
  type: z.literal('room-updated'),
  room: roomStateSchema,
});

export const playerLeftSchema = z.object({
  type: z.literal('player-left'),
  playerId: z.string(),
  room: roomStateSchema,
});

export const gameStartingSchema = z.object({
  type: z.literal('game-starting'),
  countdown: z.number(),
});


export const gameDealtSchema = z.object({
  type: z.literal('game-dealt'),
  phase: z.enum(['dealing', 'swapping', 'transitioning', 'playing', 'finished']),
  hand: z.array(cardSchema),
  faceUp: z.array(cardSchema),
  faceDownCount: z.number(),
  opponents: z.array(opponentViewSchema),
  drawPileCount: z.number(),
  discardPile: z.array(cardSchema),
  currentPlayerIndex: z.number(),
  dealerIndex: z.number(),
  firstTurn: z.boolean(),
});

export const swapTimerTickSchema = z.object({
  type: z.literal('swap-timer-tick'),
  timeRemaining: z.number().int().min(0).max(30),
});

export const playerReadySchema = z.object({
  type: z.literal('player-ready'),
  playerId: z.string(),
  readyPlayers: z.array(z.string()),
});

export const swapPhaseCompleteSchema = z.object({
  type: z.literal('swap-phase-complete'),
  reason: z.enum(['timer-expired', 'all-ready']),
});

export const swapCardsUpdatedSchema = z.object({
  type: z.literal('swap-cards-updated'),
  hand: z.array(cardSchema),
  faceUp: z.array(cardSchema),
  opponents: z.array(opponentViewSchema),
});

export const cardPlayedSchema = z.object({
  type: z.literal('card-played'),
  playerId: z.string(),
  cards: z.array(cardSchema),
  currentPlayerIndex: z.number(),
  drawPileCount: z.number(),
  discardPile: z.array(cardSchema),
  hand: z.array(cardSchema).optional(),
  faceUp: z.array(cardSchema).optional(),
  faceDownCount: z.number().optional(),
  opponents: z.array(opponentViewSchema).optional(),
  firstTurn: z.boolean(),
});

export const pilePickupSchema = z.object({
  type: z.literal('pile-pickup'),
  playerId: z.string(),
  currentPlayerIndex: z.number(),
  discardPile: z.array(cardSchema),
  hand: z.array(cardSchema).optional(),
  faceUp: z.array(cardSchema).optional(),
  faceDownCount: z.number().optional(),
  opponents: z.array(opponentViewSchema).optional(),
});

export const turnChangedSchema = z.object({
  type: z.literal('turn-changed'),
  currentPlayerIndex: z.number(),
});

export const faceDownResultSchema = z.object({
  type: z.literal('face-down-result'),
  playerId: z.string(),
  card: cardSchema,
  playable: z.boolean(),
  currentPlayerIndex: z.number(),
  discardPile: z.array(cardSchema),
  hand: z.array(cardSchema).optional(),
  faceDownCount: z.number().optional(),
  opponents: z.array(opponentViewSchema).optional(),
});

export const playerEliminatedSchema = z.object({
  type: z.literal('player-eliminated'),
  playerId: z.string(),
  nickname: z.string(),
  currentPlayerIndex: z.number(),
});

export const gameOverSchema = z.object({
  type: z.literal('game-over'),
  shitheadId: z.string(),
  shitheadNickname: z.string(),
});

export const turnTimerTickSchema = z.object({
  type: z.literal('turn-timer-tick'),
  timeRemaining: z.number().int().min(0).max(45),
  currentPlayerIndex: z.number().int().min(0),
});

export const playerDisconnectedSchema = z.object({
  type: z.literal('player-disconnected'),
  playerId: z.string(),
  nickname: z.string(),
  graceTimeRemaining: z.number(),
});

export const playerReconnectedSchema = z.object({
  type: z.literal('player-reconnected'),
  playerId: z.string(),
  nickname: z.string(),
});

export const playerRemovedSchema = z.object({
  type: z.literal('player-removed'),
  playerId: z.string(),
  nickname: z.string(),
  reason: z.enum(['timeout', 'host-left']),
});

export const returnToLobbySchema = z.object({
  type: z.literal('return-to-lobby'),
  room: roomStateSchema,
});

export const errorSchema = z.object({
  type: z.literal('error'),
  message: z.string(),
  code: z.enum([
    'ROOM_NOT_FOUND',
    'ROOM_FULL',
    'GAME_ALREADY_STARTED',
    'NOT_HOST',
    'NOT_ENOUGH_PLAYERS',
    'INVALID_NICKNAME',
    'INVALID_MESSAGE',
    'INVALID_ACTION',
    'PLAYER_NOT_FOUND',
    'ALREADY_IN_ROOM',
    'NOT_YOUR_TURN',
    'GAME_OVER',
    'MUST_PLAY_LOWEST',
  ]),
});

export const serverMessageSchema = z.discriminatedUnion('type', [
  roomCreatedSchema,
  roomJoinedSchema,
  roomUpdatedSchema,
  playerLeftSchema,
  gameStartingSchema,
  gameDealtSchema,
  swapTimerTickSchema,
  playerReadySchema,
  swapPhaseCompleteSchema,
  swapCardsUpdatedSchema,
  cardPlayedSchema,
  pilePickupSchema,
  turnChangedSchema,
  turnTimerTickSchema,
  playerDisconnectedSchema,
  playerReconnectedSchema,
  playerRemovedSchema,
  faceDownResultSchema,
  playerEliminatedSchema,
  gameOverSchema,
  returnToLobbySchema,
  errorSchema,
]);
