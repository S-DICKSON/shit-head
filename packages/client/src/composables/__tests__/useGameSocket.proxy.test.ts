import { describe, it, expect } from 'vitest';
import { resolveWebSocketUrl } from '../useGameSocket';

describe('resolveWebSocketUrl', () => {
  describe('Discord Activity mode', () => {
    it('uses /.proxy/ws path for discordsays.com hosts', () => {
      const url = resolveWebSocketUrl(
        'abc123.discordsays.com',
        'https:',
        'abc123.discordsays.com',
      );
      expect(url).toBe('wss://abc123.discordsays.com/.proxy/ws');
    });

    it('uses wss for https protocol on Discord', () => {
      const url = resolveWebSocketUrl(
        'app.discordsays.com',
        'https:',
        'app.discordsays.com',
      );
      expect(url).toContain('wss://');
    });
  });

  describe('standalone web mode', () => {
    it('connects directly to port 3000 on localhost', () => {
      const url = resolveWebSocketUrl('localhost', 'http:', 'localhost:5173');
      expect(url).toBe('ws://localhost:3000/game-ws');
    });

    it('connects directly to port 3000 on 127.0.0.1', () => {
      const url = resolveWebSocketUrl('127.0.0.1', 'http:', '127.0.0.1:5173');
      expect(url).toBe('ws://127.0.0.1:3000/game-ws');
    });
  });

  describe('tunnel mode', () => {
    it('uses current host with protocol detection for non-localhost', () => {
      const url = resolveWebSocketUrl(
        'abc-tunnel.trycloudflare.com',
        'https:',
        'abc-tunnel.trycloudflare.com',
      );
      expect(url).toBe('wss://abc-tunnel.trycloudflare.com/game-ws');
    });

    it('uses ws for http protocol', () => {
      const url = resolveWebSocketUrl(
        'some-host.example.com',
        'http:',
        'some-host.example.com',
      );
      expect(url).toBe('ws://some-host.example.com/game-ws');
    });
  });

  describe('explicit server URL', () => {
    it('uses VITE_SERVER_URL when provided', () => {
      const url = resolveWebSocketUrl(
        'localhost',
        'http:',
        'localhost:5173',
        'wss://production-server.example.com',
      );
      expect(url).toBe('wss://production-server.example.com/game-ws');
    });

    it('VITE_SERVER_URL takes priority over Discord mode', () => {
      const url = resolveWebSocketUrl(
        'abc.discordsays.com',
        'https:',
        'abc.discordsays.com',
        'wss://custom-server.example.com',
      );
      expect(url).toBe('wss://custom-server.example.com/game-ws');
    });
  });
});
