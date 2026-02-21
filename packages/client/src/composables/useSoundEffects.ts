/**
 * Sound effects composable for game notifications
 * Uses Web Audio API to generate programmatic beep sounds
 */

import { ref } from 'vue';

// Module-level state (shared across instances — singleton pattern)
let audioContext: AudioContext | null = null;
const muteState = ref<boolean>(localStorage.getItem('shithead-muted') === 'true');

export function useSoundEffects() {
  function toggleMute(): void {
    muteState.value = !muteState.value;
    localStorage.setItem('shithead-muted', String(muteState.value));
  }

  /**
   * Plays a short notification beep using Web Audio API
   * - 880 Hz sine wave (high-pitched, alert-like)
   * - 150ms duration
   * - Low volume (0.15) to avoid being jarring
   */
  function playBeep(): void {
    if (muteState.value) return;

    try {
      // Create or reuse AudioContext (lazy initialization)
      if (!audioContext) {
        audioContext = new AudioContext();
      }

      // Create oscillator for the beep tone
      const oscillator = audioContext.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880; // A5 note, higher pitch = more alert-like

      // Create gain node for volume control
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.15; // Quiet but audible

      // Connect oscillator -> gain -> destination
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Play for 150ms
      const now = audioContext.currentTime;
      oscillator.start(now);
      oscillator.stop(now + 0.15);
    } catch (error) {
      // Fail gracefully on browsers that block audio
      console.warn('Failed to play notification sound:', error);
    }
  }

  /**
   * Plays a notification sound when it becomes the player's turn
   */
  function playTurnNotification(): void {
    playBeep();
  }

  return {
    muteState,
    toggleMute,
    playTurnNotification,
  };
}
