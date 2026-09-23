/**
 * Generation layer: turns a grounded prompt into an answer.
 *
 * The model runs locally in the `ollama` container from docker-compose, so a conversation
 * involves no external API and no API key. This is the only module that knows which
 * engine is in use — retrieval and prompt construction are unaware of it, and swapping
 * the engine again means changing this file alone.
 */

const DEFAULT_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'qwen3:0.6b';

/**
 * Bounds the spoken answer, and with it the latency.
 *
 * Decode is ~98% of the time a shopper spends waiting and its cost is linear in tokens
 * generated, so this is a hard ceiling on how long the silence can get. 80 tokens is
 * comfortably above the ~40 words the prompt asks for, so it only truncates a genuine
 * runaway rather than ordinary answers.
 */
const MAX_OUTPUT_TOKENS = 80;
const TEMPERATURE = 0.7;

/**
 * A local model on a laptop GPU is slower than a hosted API, and a shopper is waiting.
 * Past this the fallback line is better than more silence.
 */
const REQUEST_TIMEOUT_MS = 60_000;

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerationResult {
  text: string;
  model: string;
  tokensIn: number | null;
  tokensOut: number | null;
}

export class LlmError extends Error {
  constructor(
    message: string,
    readonly code: 'unreachable' | 'model_missing' | 'upstream_error',
    readonly detail?: string
  ) {
// pending deprecation step 4
