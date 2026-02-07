// WebSocket message types - inferred from Zod schemas
import type { z } from 'zod';
import type {
  createRoomSchema,
  joinRoomSchema,
  leaveRoomSchema,
  startGameSchema,
  swapCardsSchema,
  readyUpSchema,
  playCardsSchema,
  pickupPileSchema,
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
  errorSchema,
  clientMessageSchema,
  serverMessageSchema,
} from '../schemas/messages';

// Client-to-server message types
export type CreateRoomMessage = z.infer<typeof createRoomSchema>;
export type JoinRoomMessage = z.infer<typeof joinRoomSchema>;
export type LeaveRoomMessage = z.infer<typeof leaveRoomSchema>;
export type StartGameMessage = z.infer<typeof startGameSchema>;
export type SwapCardsMessage = z.infer<typeof swapCardsSchema>;
export type ReadyUpMessage = z.infer<typeof readyUpSchema>;
export type PlayCardsMessage = z.infer<typeof playCardsSchema>;
export type PickupPileMessage = z.infer<typeof pickupPileSchema>;

export type ClientMessage = z.infer<typeof clientMessageSchema>;

// Server-to-client message types
export type RoomCreatedMessage = z.infer<typeof roomCreatedSchema>;
export type RoomJoinedMessage = z.infer<typeof roomJoinedSchema>;
export type RoomUpdatedMessage = z.infer<typeof roomUpdatedSchema>;
export type PlayerLeftMessage = z.infer<typeof playerLeftSchema>;
export type GameStartingMessage = z.infer<typeof gameStartingSchema>;
export type GameDealtMessage = z.infer<typeof gameDealtSchema>;
export type SwapTimerTickMessage = z.infer<typeof swapTimerTickSchema>;
export type PlayerReadyMessage = z.infer<typeof playerReadySchema>;
export type SwapPhaseCompleteMessage = z.infer<typeof swapPhaseCompleteSchema>;
export type SwapCardsUpdatedMessage = z.infer<typeof swapCardsUpdatedSchema>;
export type CardPlayedMessage = z.infer<typeof cardPlayedSchema>;
export type PilePickupMessage = z.infer<typeof pilePickupSchema>;
export type TurnChangedMessage = z.infer<typeof turnChangedSchema>;
export type ErrorMessage = z.infer<typeof errorSchema>;

export type ServerMessage = z.infer<typeof serverMessageSchema>;

// Error codes
export type ErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'GAME_ALREADY_STARTED'
  | 'NOT_HOST'
  | 'NOT_ENOUGH_PLAYERS'
  | 'INVALID_NICKNAME'
  | 'INVALID_MESSAGE'
  | 'INVALID_ACTION'
  | 'PLAYER_NOT_FOUND'
  | 'NOT_YOUR_TURN';
