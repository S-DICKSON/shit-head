import { describe, it, expect } from 'vitest';
import { isOriginAllowed } from '../utils/originValidation';

describe('Origin Validation', () => {
  const allowedOrigins = ['http://localhost:5173', 'https://shithead.example.com'];

  describe('explicit allowlist', () => {
    it('accepts origins in the allowlist', () => {
      expect(isOriginAllowed('http://localhost:5173', allowedOrigins)).toBe(true);
      expect(isOriginAllowed('https://shithead.example.com', allowedOrigins)).toBe(true);
    });

    it('rejects origins not in the allowlist', () => {
      expect(isOriginAllowed('https://evil.com', allowedOrigins)).toBe(false);
      expect(isOriginAllowed('http://localhost:3000', allowedOrigins)).toBe(false);
    });

    it('rejects null origin', () => {
      expect(isOriginAllowed(null, allowedOrigins)).toBe(false);
    });

    it('rejects empty string origin', () => {
      expect(isOriginAllowed('', allowedOrigins)).toBe(false);
    });
  });

  describe('Discord proxy origins', () => {
    it('accepts any *.discordsays.com origin', () => {
      expect(isOriginAllowed('https://abc123.discordsays.com', allowedOrigins)).toBe(true);
      expect(isOriginAllowed('https://my-app.discordsays.com', allowedOrigins)).toBe(true);
    });

    it('rejects origins that contain but dont end with discordsays.com', () => {
      expect(isOriginAllowed('https://discordsays.com.evil.com', allowedOrigins)).toBe(false);
      expect(isOriginAllowed('https://notdiscordsays.com', allowedOrigins)).toBe(false);
    });

    it('accepts bare discordsays.com', () => {
      expect(isOriginAllowed('https://discordsays.com', allowedOrigins)).toBe(true);
    });
  });

  describe('malformed origins', () => {
    it('rejects invalid URLs gracefully', () => {
      expect(isOriginAllowed('not-a-url', allowedOrigins)).toBe(false);
      expect(isOriginAllowed('://broken', allowedOrigins)).toBe(false);
    });
  });
});
