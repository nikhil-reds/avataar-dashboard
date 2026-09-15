// Client-side only — only import from 'use client' components.

/**
 * Why voice chat could not be started.
 *
 * These all come out of `getUserMedia` as a DOMException, and the browser's own
 * message ("Requested device not found") does not tell a shopper what to do about
 * it, so each one is translated into an instruction.
 */
export type MicReason = 'missing' | 'denied' | 'busy' | 'insecure' | 'unknown';

export interface MicFailure {
  reason: MicReason;
  message: string;
  /** False when nothing about the machine has changed, so a retry is pointless. */
  retryable: boolean;
}

function nameOf(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'name' in err) {
    return String((err as { name: unknown }).name);
  }
  return '';
}

export function describeMicFailure(err: unknown): MicFailure {
  switch (nameOf(err)) {
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return {
        reason: 'missing',
        message:
          'No microphone was found. Plug one in and try again — you can keep watching in the meantime.',
        retryable: true,
      };

    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return {
        reason: 'denied',
        message:
          'Microphone access was blocked. Allow it for this site in your browser settings, then try again.',
        retryable: true,
      };

    case 'NotReadableError':
    case 'TrackStartError':
      return {
        reason: 'busy',
        message:
          'The microphone is in use by another app. Close it and try again.',
        retryable: true,
      };

    // getUserMedia is unavailable outside a secure context, so no retry will help
    // until the page is served over HTTPS or from localhost.
    case 'SecurityError':
      return {
        reason: 'insecure',
        message:
          'Microphone access needs a secure connection (HTTPS). Voice chat is unavailable on this address.',
        retryable: false,
      };

    default:
      return {
        reason: 'unknown',
        message:
          'The microphone could not be started. Check your audio settings and try again.',
        retryable: true,
      };
  }
}
