import { BUFFER_RESPONSES } from '@/app/constants/bufferResponses';
import { BUFFER_AUDIO_MANIFEST } from '@/app/constants/bufferAudio';

/**
 * Buffer selection — the fast path.
 *
 * This module is deliberately synchronous and dependency-free. It does not touch
 * Redis, Postgres, retrieval, the page index or any network service, because the whole
 * point of the buffer is to put sound in the room before any of that work starts. If
 * you are ever tempted to `await` in here, the buffer has stopped being a buffer.
 *
 * Delivery is HeyGen-native:
 *   - `avatar.speak_audio`  (SDK `repeatAudio`) when pre-generated audio is registered
 *   - `avatar.speak_text`   (SDK `repeat`)      otherwise — speaks the literal text
 *
 * Both bypass HeyGen's LLM, which is what keeps the buffer from being confused with
 * the real answer. `avatar.speak_response` (SDK `message`) is NOT used here: that one
 * routes through the LLM and would generate a second answer.
 */

/** How the client should hand this buffer to HeyGen. */
export type BufferDelivery = 'speak_audio' | 'speak_text';

export interface SelectedBuffer {
  id: string;
  text: string;
  audioKey: string;
  delivery: BufferDelivery;
  /** Present only when `delivery` is `speak_audio`. */
  audio: { url: string; format: 'wav' | 'mp3'; sampleRate?: number } | null;
}

/**
 * Keyword buckets. Indices point into BUFFER_RESPONSES; the fallback covers anything
 * that matches nothing, so selection is total and never throws on an odd utterance.
 */
const RULES: Array<{ match: RegExp; index: number }> = [
  { match: /\b(why|how come|explain)\b/, index: 2 },
  { match: /\b(how|which|compare)\b/, index: 17 },
  { match: /\b(wait|hold on|confused|sorry)\b/, index: 14 },
  { match: /\b(what|where|when|who)\b|\?/, index: 17 },
];

const FALLBACK_INDEX = 0;

function at(index: number): SelectedBuffer {
  const selected = BUFFER_RESPONSES[index] ?? BUFFER_RESPONSES[FALLBACK_INDEX];
  const audio = BUFFER_AUDIO_MANIFEST[selected.audioKey] ?? null;

  return {
    id: selected.id,
    text: selected.example,
    audioKey: selected.audioKey,
    delivery: audio ? 'speak_audio' : 'speak_text',
    audio,
  };
}

/**
 * Pick a buffer for an utterance. Pure and deterministic: the same text always yields
 * the same buffer, which is what makes the fast path testable.
 */
export function selectBuffer(message: string): SelectedBuffer {
  const lower = message.toLowerCase();

  for (const rule of RULES) {
    if (rule.match.test(lower)) return at(rule.index);
  }

  return at(FALLBACK_INDEX);
}

/** True when every buffer phrase has pre-generated audio registered. */
export function bufferAudioReady(): boolean {
  return BUFFER_RESPONSES.every((r) => Boolean(BUFFER_AUDIO_MANIFEST[r.audioKey]));
}

/** @deprecated Use {@link selectBuffer}. Kept so older imports keep compiling. */
export const selectBufferResponse = selectBuffer;
