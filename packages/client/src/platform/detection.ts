/**
 * Platform detection for dual-mode architecture (web vs Discord Activity).
 *
 * Detection strategy:
 * - 'discord': iframe context + Discord query params (frame_id, instance_id)
 * - 'web': default for standalone browser access
 */

export type Platform = 'discord' | 'web';

/**
 * Detect the current platform based on environment.
 *
 * Discord Activity detection:
 * - Must be in iframe context (window.self !== window.top)
 * - AND must have Discord query params (frame_id, instance_id)
 *
 * @returns 'discord' if both conditions met, otherwise 'web'
 */
export function detectPlatform(): Platform {
  // Check if running in iframe
  const isIframe = window.self !== window.top;

  if (!isIframe) {
    return 'web';
  }

  // Check for Discord Activity query params
  const params = new URLSearchParams(window.location.search);
  const hasFrameId = params.has('frame_id');
  const hasInstanceId = params.has('instance_id');

  // Both conditions must be true for Discord Activity
  return (hasFrameId && hasInstanceId) ? 'discord' : 'web';
}
