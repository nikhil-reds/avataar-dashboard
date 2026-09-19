import { selectBuffer, type SelectedBuffer } from './buffer';
import {
  createTurn,
  measureTurn,
  transcriptFingerprint,
  transition,
  type TurnLatency,
  type TurnRecord,
  type TurnState,
} from './turnState';

/**
 * Client-side turn orchestration.
 *
 * Lives on the client because that is where the decisions have to be instant: the
 * buffer must be spoken before any network round trip, and duplicate suppression must
 * happen before a second `speak` command is ever issued. A server-side guard cannot
 * prevent double-speak that the client already emitted.
 *
 * Deliberately free of React and of the HeyGen SDK — every side effect arrives as a
 * callback — so the whole lifecycle can be exercised without a browser or a billable
 * avatar session.
 */

export interface TurnManagerHooks {
  /** HeyGen `avatar.speak_text` — speaks literal text, bypassing HeyGen's LLM. */
  speakText: (text: string) => void;
  /** HeyGen `avatar.speak_audio` — pre-generated buffer audio. */
  speakAudio?: (audioUrl: string) => void;
  /** HeyGen `avatar.interrupt`. */
  interrupt: () => void;
  /** Report a lifecycle event to the orchestration route. Must never throw. */
  report?: (payload: TurnReport) => void;
  /** Diagnostics sink. */
  onEvent?: (event: TurnManagerEvent) => void;
  now?: () => number;
}

export interface TurnReport {
  sessionId: string | null;
  turnId: string | null;
  text?: string;
  action: 'partial' | 'final' | 'interrupt' | 'answer_started' | 'answer_completed';
}

export interface TurnManagerEvent {
  type: 'turn.started' | 'buffer' | 'turn.state' | 'duplicate' | 'interrupt' | 'rejected';
  turnId: string | null;
  state?: TurnState;
  reason?: string;
  buffer?: SelectedBuffer;
  latency?: TurnLatency;
  at: number;
}

export interface TurnManagerOptions {
  /**
   * Speak a filler phrase the moment a final transcript lands.
   *
   * Default OFF. In `AgentType.FULL` HeyGen's own LLM also answers every utterance, so
   * a client-side filler plus HeyGen's reply is two utterances for one question. That
   * interleaving cannot be confirmed without a live (billable) session, so this stays
   * opt-in rather than shipped on an assumption. The selection and delivery path are
   * fully implemented and tested; only the live interleaving is unverified.
   */
  speakBuffer?: boolean;
}

export class TurnManager {
  private readonly hooks: TurnManagerHooks;
  private readonly options: Required<TurnManagerOptions>;
  private readonly now: () => number;

  private sessionId: string | null = null;
  private current: TurnRecord | null = null;
  private avatarSpeaking = false;

  /** Fingerprints of finals already handled, so a repeat cannot open a second turn. */
  private readonly seen = new Set<string>();
  /** Turn ids that have already emitted a buffer. The double-speak guard. */
  private readonly buffered = new Set<string>();

  constructor(hooks: TurnManagerHooks, options: TurnManagerOptions = {}) {
    this.hooks = hooks;
    this.options = { speakBuffer: options.speakBuffer ?? false };
    this.now = hooks.now ?? (() => Date.now());
  }

  attachSession(sessionId: string | null) {
    this.sessionId = sessionId;
  }

  get activeTurnId(): string | null {
    return this.current?.turnId ?? null;
  }

  get state(): TurnState | null {
    return this.current?.state ?? null;
  }

  private emit(event: TurnManagerEvent) {
    try {
      this.hooks.onEvent?.(event);
    } catch {
      // Diagnostics must never break a turn.
    }
  }

  private report(payload: TurnReport) {
    try {
      this.hooks.report?.(payload);
    } catch {
      // Reporting is best-effort; the avatar keeps talking regardless.
    }
  }

  /** Partial transcript. Intentionally does almost nothing. */
  onPartialTranscript(_text: string) {
    // No retrieval, no turn, no buffer, no network. Present so the call site reads
    // explicitly rather than leaving partials silently unhandled.
    void _text;
  }

  /**
   * Final transcript: open a turn and put sound in the room immediately.
   *
   * Returns the turnId, or null when the utterance was a duplicate or empty.
   */
  onFinalTranscript(text: string, eventId?: string): string | null {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const at = this.now();
    const fingerprint = eventId ?? transcriptFingerprint(trimmed, at);

    if (this.seen.has(fingerprint)) {
      this.emit({ type: 'duplicate', turnId: this.current?.turnId ?? null, at });
      return null;
    }
    this.seen.add(fingerprint);

    // A new utterance while a turn is open means the previous one is abandoned.
    if (this.current && !['ANSWER_COMPLETED', 'INTERRUPTED', 'FAILED', 'SAVED'].includes(this.current.state)) {
      this.abandonCurrent('superseded by a new utterance');
    }

    const turnId = globalThis.crypto?.randomUUID?.() ?? `turn_${at}_${Math.random().toString(36).slice(2)}`;
    this.current = createTurn(turnId, this.sessionId ?? 'pending', trimmed, at);
    this.emit({ type: 'turn.started', turnId, state: 'RECEIVED', at });

    this.fireBuffer(trimmed, turnId, at);

    // Network last, and not awaited: the buffer has already been spoken.
    this.report({ sessionId: this.sessionId, turnId, text: trimmed, action: 'final' });

    return turnId;
  }

  /**
   * The buffer fast path. Synchronous, zero I/O, at most once per turn.
   */
  private fireBuffer(text: string, turnId: string, at: number) {
    if (this.buffered.has(turnId)) return;
    this.buffered.add(turnId);

    const buffer = selectBuffer(text);
    if (this.current) {
      this.current = { ...this.current, timings: { ...this.current.timings, bufferRequestedAt: at } };
    }

    if (this.options.speakBuffer) {
      try {
        if (buffer.delivery === 'speak_audio' && buffer.audio && this.hooks.speakAudio) {
          this.hooks.speakAudio(buffer.audio.url);
        } else {
          this.hooks.speakText(buffer.text);
        }
        this.advance('BUFFER_STARTED');
      } catch {
        // A failed buffer must not stop HeyGen from answering.
      }
    }

    this.emit({ type: 'buffer', turnId, buffer, at: this.now() });
  }

  /** Avatar began speaking — HeyGen's answer is under way. */
  onAvatarSpeakStarted() {
    this.avatarSpeaking = true;
    if (!this.current) return;

    const at = this.now();
    if (this.current.timings.firstAudioAt === undefined) {
      this.current = { ...this.current, timings: { ...this.current.timings, firstAudioAt: at } };
    }

    if (this.advance('ANSWER_STARTED')) {
      this.report({
        sessionId: this.sessionId,
        turnId: this.current.turnId,
        action: 'answer_started',
      });
    }
  }

  onAvatarSpeakEnded() {
    this.avatarSpeaking = false;
    if (!this.current) return;

    if (this.advance('ANSWER_COMPLETED')) {
      this.report({
        sessionId: this.sessionId,
        turnId: this.current.turnId,
        action: 'answer_completed',
      });
      this.emit({
        type: 'turn.state',
        turnId: this.current.turnId,
        state: this.current.state,
        latency: measureTurn(this.current),
        at: this.now(),
      });
    }
  }

  /**
   * Barge-in: the shopper started talking over the avatar.
   *
   * Only interrupts when the avatar is actually speaking, so a normal turn boundary
   * does not fire a pointless interrupt command at HeyGen.
   */
  onUserSpeakStarted() {
    if (!this.avatarSpeaking) return;

    const at = this.now();
    try {
      this.hooks.interrupt();
    } catch {
      // Even if the command fails, the local turn is still abandoned below.
    }
    this.avatarSpeaking = false;

    const turnId = this.current?.turnId ?? null;
    this.abandonCurrent('barge-in');
    this.emit({ type: 'interrupt', turnId, at });
    this.report({ sessionId: this.sessionId, turnId, action: 'interrupt' });
  }

  /**
   * Move the current turn. Returns false when the state machine refuses, which is how
   * a late callback for an abandoned turn is prevented from completing it.
   */
  private advance(to: TurnState): boolean {
    if (!this.current) return false;

    const result = transition(this.current, to, this.now());
    if (!result.ok) {
      this.emit({
        type: 'rejected',
        turnId: this.current.turnId,
        state: this.current.state,
        reason: result.reason,
        at: this.now(),
      });
      return false;
    }

    this.current = result.turn;
    this.emit({ type: 'turn.state', turnId: this.current.turnId, state: to, at: this.now() });
    return true;
  }

  private abandonCurrent(reason: string) {
    if (!this.current) return;
    const result = transition(this.current, 'INTERRUPTED', this.now(), reason);
    if (result.ok) this.current = result.turn;
  }

  /** Session ended. Clears per-session state so a reconnect starts clean. */
  reset() {
    this.current = null;
    this.avatarSpeaking = false;
    this.seen.clear();
    this.buffered.clear();
    this.sessionId = null;
  }
}
