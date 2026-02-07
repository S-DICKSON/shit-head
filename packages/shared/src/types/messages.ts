// WebSocket message types - inferred from Zod schemas
import type { z } from 'zod';
import type {
  createRoomSchema,
  joinRoomSchema,
  leaveRoomSchema,
  startGameSchema,
  roomCreatedSchema,
  roomJoinedSchema,
  roomUpdatedSchema,
  playerLeftSchema,
  gameStartingSchema,
  gameStartedSchema,
  errorSchema,
  clientMessageSchema,
  serverMessageSchema,
} from '../schemas/messages';

// Client-to-server message types
export type CreateRoomMessage = z.infer<typeof createRoomSchema>;
export type JoinRoomMessage = z.infer<typeof joinRoomSchema>;
export type LeaveRoomMessage = z.infer<typeof leaveRoomSchema>;
export type StartGameMessage = z.infer<typeof startGameSchema>;

export type ClientMessage = z.infer<typeof clientMessageSchema>;

// Server-to-client message types
export type RoomCreatedMessage = z.infer<typeof roomCreatedSchema>;
export type RoomJoinedMessage = z.infer<typeof roomJoinedSchema>;
export type RoomUpdatedMessage = z.infer<typeof roomUpdatedSchema>;
export type PlayerLeftMessage = z.infer<typeof playerLeftSchema>;
export type GameStartingMessage = z.infer<typeof gameStartingSchema>;
export type GameStartedMessage = z.infer<typeof gameStartedSchema>;
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
  | 'INVALID_MESSAGE';
