/**
 * Sound effects composable for game notifications
 * Uses Web Audio API to generate programmatic beep sounds
 */

// Module-level state (shared across instances)
let audioContext: AudioContext | null = null;

export function useSoundEffects() {
  /**
   * Plays a short notification beep using Web Audio API
   * - 880 Hz sine wave (high-pitched, alert-like)
   * - 150ms duration
   * - Low volume (0.15) to avoid being jarring
   */
  function playBeep(): void {
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
    playTurnNotification,
  };
}
