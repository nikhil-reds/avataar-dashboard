/**
 * Manifest for pre-generated buffer audio.
 *
 * Place files under `public/audio/buffers/<audioKey>.wav` or `.mp3` and add the URL
 * here. The live stream route emits this metadata immediately so the avatar path can
 * play cached audio without waiting for LLM or TTS.
 */
export const BUFFER_AUDIO_MANIFEST: Record<
  string,
  { url: string; format: 'wav' | 'mp3'; sampleRate?: number }
> = {};
