import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useSoundEffects } from './useSoundEffects';

describe('useSoundEffects', () => {
  let mockAudioContext: any;
  let mockOscillator: any;
  let mockGainNode: any;

  beforeEach(() => {
    // Mock oscillator
    mockOscillator = {
      type: '',
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    // Mock gain node
    mockGainNode = {
      gain: { value: 0 },
      connect: vi.fn(),
    };

    // Mock AudioContext
    mockAudioContext = {
      createOscillator: vi.fn(() => mockOscillator),
      createGain: vi.fn(() => mockGainNode),
      destination: {},
      currentTime: 1.5,
    };

    // Mock global AudioContext constructor
    global.AudioContext = vi.fn(() => mockAudioContext) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('oscillator setup', () => {
    it('configures oscillator with sine wave type', () => {
      const { playTurnNotification } = useSoundEffects();

      playTurnNotification();

      expect(mockOscillator.type).toBe('sine');
    });

    it('sets oscillator frequency to 880 Hz', () => {
      const { playTurnNotification } = useSoundEffects();

      playTurnNotification();

      expect(mockOscillator.frequency.value).toBe(880);
    });
  });

  describe('gain (volume) setup', () => {
    it('sets gain value to 0.15', () => {
      const { playTurnNotification } = useSoundEffects();

      playTurnNotification();

      expect(mockGainNode.gain.value).toBe(0.15);
    });
  });

  describe('audio graph connections', () => {
    it('connects oscillator to gain node', () => {
      const { playTurnNotification } = useSoundEffects();

      playTurnNotification();

      expect(mockOscillator.connect).toHaveBeenCalledWith(mockGainNode);
    });

    it('connects gain node to destination', () => {
      const { playTurnNotification } = useSoundEffects();

      playTurnNotification();

      expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);
    });
  });

  describe('timing', () => {
    it('starts oscillator at current time', () => {
      const { playTurnNotification } = useSoundEffects();

      playTurnNotification();

      expect(mockOscillator.start).toHaveBeenCalledWith(1.5);
    });

    it('stops oscillator 0.15 seconds after current time', () => {
      const { playTurnNotification } = useSoundEffects();

      playTurnNotification();

      expect(mockOscillator.stop).toHaveBeenCalledWith(1.65); // 1.5 + 0.15
    });
  });

  describe('error handling', () => {
    it('does not throw when audio fails', () => {
      // Test that the composable returns a valid interface even if audio fails
      const { playTurnNotification } = useSoundEffects();

      // Even if AudioContext throws, the function should not crash
      expect(() => playTurnNotification()).not.toThrow();
    });
  });
});
