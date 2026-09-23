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
    super(message);
    this.name = 'LlmError';
  }
}

export function llmBaseUrl(): string {
  return (process.env.OLLAMA_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
}

export function llmModel(): string {
  return process.env.OLLAMA_MODEL ?? DEFAULT_MODEL;
}

/**
 * Qwen3 is a hybrid reasoning model: left to itself it deliberates at length before
 * answering. The avatar speaks whatever it is handed, so none of that may reach it.
 *
 * `/no_think` in the system prompt is the primary defence — it stops the deliberation
 * being generated at all, which also cuts latency by roughly two thirds. This function is
 * the second line, and it has to handle a shape that is easy to miss: Qwen3's chat
 * template supplies the opening `<think>` itself, so what comes back is untagged prose
 * terminated by a *dangling* `</think>`, with the real answer after it. Matching only
 * balanced pairs would let the whole monologue through.
 */
export function stripReasoning(text: string): string {
  let out = text;

  // Everything up to the last closing tag is deliberation, opened or not.
  const lastClose = out.lastIndexOf('</think>');
  if (lastClose !== -1) out = out.slice(lastClose + '</think>'.length);

  // Defensive: balanced pairs, then an unterminated block (a reply cut off mid-thought,
  // which holds no answer worth keeping).
  out = out.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<think>[\s\S]*$/i, '');

  return out.trim();
}

/** Punctuation and spacing differ between the question and its echo; identity does not. */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Removes a question the model repeated back before answering.
 *
 * Small models open with "Do you have an office in Mumbai? I don't have that information."
 * The avatar speaks whatever it is handed, so the shopper would hear their own question
 * read back to them. The prompt asks the model not to do this; this is the guarantee.
 *
 * Deliberately conservative: it acts only when the opening sentence normalises to exactly
 * the question, so a genuine answer that merely reuses a few of the question's words is
 * never touched.
 *
 * Returns '' when the reply is nothing but the question repeated — qwen3:0.6b does this on
 * yes/no questions the knowledge base does not cover. There is no answer in that reply to
 * salvage, and an empty string tells the caller to speak its fallback line instead, which
 * beats having the avatar parrot the shopper back at themselves.
 */
export function stripEchoedQuestion(answer: string, question: string): string {
  const target = normalise(question);
  if (!target) return answer;

  const trimmed = answer.trim();
  if (normalise(trimmed) === target) return '';

  // Split after the first sentence-ending mark, keeping the remainder intact.
  const match = /^([^.!?]*[.!?])\s*([\s\S]*)$/.exec(trimmed);
  if (!match) return answer;

  const [, opening, rest] = match;
  if (!rest.trim()) return answer;

  return normalise(opening) === target ? rest.trim() : answer;
}

/**
 * Generates one answer.
 *
 * Throws `LlmError` rather than returning a sentinel, so the caller decides what the
 * avatar says when generation fails.
 */
export async function generateAnswer(
  systemPrompt: string,
  history: ChatTurn[],
  message: string
): Promise<GenerationResult> {
  const model = llmModel();
  const url = `${llmBaseUrl()}/api/chat`;

  let res: Response;
// pending deprecation step 2
