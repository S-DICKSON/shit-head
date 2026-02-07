// Zod validation schemas for WebSocket messages
import { z } from 'zod';
import type { RoomState } from '../types/room';

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

export const clientMessageSchema = z.discriminatedUnion('type', [
  createRoomSchema,
  joinRoomSchema,
  leaveRoomSchema,
  startGameSchema,
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

export const gameStartedSchema = z.object({
  type: z.literal('game-started'),
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
  ]),
});

export const serverMessageSchema = z.discriminatedUnion('type', [
  roomCreatedSchema,
  roomJoinedSchema,
  roomUpdatedSchema,
  playerLeftSchema,
  gameStartingSchema,
  gameStartedSchema,
  errorSchema,
]);
