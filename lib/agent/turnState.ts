/**
 * Turn lifecycle.
 *
 * One shopper utterance is one turn, identified by a `turnId`. The state machine
 * exists to stop two things that are easy to get wrong in a barge-in voice UI:
 *
 *  1. Double-speak — a buffer or answer firing twice for the same utterance.
 *  2. Zombie completions — a delayed callback from an interrupted turn arriving late
 *     and marking that turn ANSWER_COMPLETED after the next turn already started.
 *
 * Both are prevented by refusing invalid transitions rather than by timing luck.
 */

export const TURN_STATES = [
  'RECEIVED',
  'BUFFER_STARTED',
  'CONTEXT_READY',
  'ANSWER_STARTED',
  'ANSWER_COMPLETED',
  'INTERRUPTED',
  'FAILED',
  'SAVED',
] as const;

export type TurnState = (typeof TURN_STATES)[number];

/**
 * Allowed transitions. INTERRUPTED and FAILED are terminal except for SAVED, so a
 * late callback can persist what happened but can never resurrect the turn into a
 * completed state.
 */
const TRANSITIONS: Record<TurnState, readonly TurnState[]> = {
  RECEIVED: ['BUFFER_STARTED', 'CONTEXT_READY', 'ANSWER_STARTED', 'INTERRUPTED', 'FAILED'],
  BUFFER_STARTED: ['CONTEXT_READY', 'ANSWER_STARTED', 'INTERRUPTED', 'FAILED'],
  CONTEXT_READY: ['ANSWER_STARTED', 'INTERRUPTED', 'FAILED'],
  ANSWER_STARTED: ['ANSWER_COMPLETED', 'INTERRUPTED', 'FAILED'],
  ANSWER_COMPLETED: ['SAVED', 'INTERRUPTED'],
  INTERRUPTED: ['SAVED'],
  FAILED: ['SAVED'],
  SAVED: [],
} as const;

export function canTransition(from: TurnState, to: TurnState): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isTerminal(state: TurnState): boolean {
  return TRANSITIONS[state].length === 0;
}

/** A turn that was interrupted or failed must never later report success. */
export function isAbandoned(state: TurnState): boolean {
  return state === 'INTERRUPTED' || state === 'FAILED';
}

export interface TurnTimings {
  transcriptReceivedAt?: number;
  bufferRequestedAt?: number;
  bufferStartedAt?: number;
  contextStartedAt?: number;
  contextReadyAt?: number;
  answerStartedAt?: number;
  firstAudioAt?: number;
  answerCompletedAt?: number;
  interruptedAt?: number;
  persistedAt?: number;
}

export interface TurnRecord {
  turnId: string;
  sessionId: string;
  state: TurnState;
  /** The shopper utterance that opened the turn. */
  text: string;
  timings: TurnTimings;
  /** Every transition taken, for diagnosing a turn after the fact. */
  history: Array<{ state: TurnState; at: number }>;
  error?: string;
}

export function createTurn(turnId: string, sessionId: string, text: string, now = Date.now()): TurnRecord {
  return {
    turnId,
    sessionId,
    state: 'RECEIVED',
    text,
    timings: { transcriptReceivedAt: now },
    history: [{ state: 'RECEIVED', at: now }],
  };
}

/** Which timing stamp a state records on entry. */
const TIMING_FOR_STATE: Partial<Record<TurnState, keyof TurnTimings>> = {
  BUFFER_STARTED: 'bufferStartedAt',
  CONTEXT_READY: 'contextReadyAt',
  ANSWER_STARTED: 'answerStartedAt',
  ANSWER_COMPLETED: 'answerCompletedAt',
  INTERRUPTED: 'interruptedAt',
  SAVED: 'persistedAt',
};

export type TransitionResult =
  | { ok: true; turn: TurnRecord }
  | { ok: false; reason: string; turn: TurnRecord };

/**
 * Apply a transition. Returns the unchanged turn with a reason when the move is not
 * legal, so callers can log the rejection instead of silently corrupting state.
 */
export function transition(
  turn: TurnRecord,
  to: TurnState,
  now = Date.now(),
  error?: string
): TransitionResult {
  if (!canTransition(turn.state, to)) {
    return {
      ok: false,
      reason: `illegal transition ${turn.state} -> ${to}`,
      turn,
    };
  }

  const timingKey = TIMING_FOR_STATE[to];

  return {
    ok: true,
    turn: {
      ...turn,
      state: to,
      error: error ?? turn.error,
      timings: timingKey ? { ...turn.timings, [timingKey]: now } : turn.timings,
      history: [...turn.history, { state: to, at: now }],
    },
  };
}

export interface TurnLatency {
  /** How long the shopper waited before hearing anything at all. */
  transcriptToBufferMs: number | null;
  /** How long until the real answer began. */
  transcriptToAnswerMs: number | null;
  /** How long until the first avatar audio, buffer or answer, whichever came first. */
  transcriptToFirstAudioMs: number | null;
  contextMs: number | null;
  answerDurationMs: number | null;
  totalMs: number | null;
}

function span(from: number | undefined, to: number | undefined): number | null {
  if (from === undefined || to === undefined) return null;
  const delta = to - from;
  return delta >= 0 ? delta : null;
}

export function measureTurn(turn: TurnRecord): TurnLatency {
  const t = turn.timings;
  const start = t.transcriptReceivedAt;
  const end = t.answerCompletedAt ?? t.interruptedAt ?? t.persistedAt;

  return {
    transcriptToBufferMs: span(start, t.bufferStartedAt),
    transcriptToAnswerMs: span(start, t.answerStartedAt),
    transcriptToFirstAudioMs: span(start, t.firstAudioAt ?? t.bufferStartedAt),
    contextMs: span(t.contextStartedAt, t.contextReadyAt),
    answerDurationMs: span(t.answerStartedAt, t.answerCompletedAt),
    totalMs: span(start, end),
  };
}

/**
 * Stable fingerprint for a final transcript, used to collapse duplicate events.
 *
 * Quantised to a 3s window so the same sentence re-delivered by a retry folds onto one
 * turn, while the shopper genuinely repeating themselves later does not.
 */
export function transcriptFingerprint(text: string, now = Date.now()): string {
  const normalized = text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const window = Math.floor(now / 3000);
  return `${window}:${normalized.slice(0, 120)}`;
}
