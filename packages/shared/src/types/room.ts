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
};

export type RoomStatus = 'waiting' | 'countdown' | 'playing';

export type RoomState = {
  code: string;
  players: LobbyPlayer[];
  status: RoomStatus;
  hostId: string;
  maxPlayers: 4;
  minPlayers: 2;
};
