// Room and player state types for lobby management

export type Player = {
  id: string;
  nickname: string;
  isHost: boolean;
};

export type LobbyPlayer = {
  id: string;
  nickname: string;
  isHost: boolean;
  avatarHash?: string | null; // Discord avatar hash, null for web players
  discordUserId?: string | null; // Discord user ID for CDN avatar URLs
  isBot?: boolean; // True for bot players, omitted for human players
};

export type RoomStatus = 'waiting' | 'countdown' | 'playing';

export type RoundTime = 30 | 45 | 60;

export type RoomState = {
  code: string;
  players: LobbyPlayer[];
  status: RoomStatus;
  hostId: string;
  maxPlayers: 4;
  minPlayers: 2;
  spectatorCount: number;        // How many spectators are watching
  shitheadPlayerId: string | null; // Previous game's loser, null when no previous game
  roundTime: RoundTime;
};
