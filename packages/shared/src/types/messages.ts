// WebSocket message types - inferred from Zod schemas
import * as z from 'zod';
import type {
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
  joinOrCreateSchema,
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
  spectatorStateSchema,
  spectatorCountSchema,
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
export type PlayFaceDownMessage = z.infer<typeof playFaceDownSchema>;
export type ReconnectMessage = z.infer<typeof reconnectSchema>;
export type RenamePlayerMessage = z.infer<typeof renamePlayerSchema>;
export type PlayAgainMessage = z.infer<typeof playAgainSchema>;
export type JoinOrCreateMessage = z.infer<typeof joinOrCreateSchema>;

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
export type TurnTimerTickMessage = z.infer<typeof turnTimerTickSchema>;
export type PlayerDisconnectedMessage = z.infer<typeof playerDisconnectedSchema>;
export type PlayerReconnectedMessage = z.infer<typeof playerReconnectedSchema>;
export type PlayerRemovedMessage = z.infer<typeof playerRemovedSchema>;
export type FaceDownResultMessage = z.infer<typeof faceDownResultSchema>;
export type PlayerEliminatedMessage = z.infer<typeof playerEliminatedSchema>;
export type GameOverMessage = z.infer<typeof gameOverSchema>;
export type ReturnToLobbyMessage = z.infer<typeof returnToLobbySchema>;
export type ErrorMessage = z.infer<typeof errorSchema>;
export type SpectatorStateMessage = z.infer<typeof spectatorStateSchema>;
export type SpectatorCountMessage = z.infer<typeof spectatorCountSchema>;

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
  | 'ALREADY_IN_ROOM'
  | 'NOT_YOUR_TURN'
  | 'GAME_OVER'
  | 'MUST_PLAY_LOWEST';
