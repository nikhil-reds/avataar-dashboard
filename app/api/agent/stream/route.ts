import { LogKind, LogStatus } from '@prisma/client';

import { recordActivity } from '@/lib/activity';
import { selectBuffer } from '@/lib/agent/buffer';
import { appendSessionMemory, buildContext } from '@/lib/agent/context';
import {
  createTurn,
  measureTurn,
  transcriptFingerprint,
  transition,
  type TurnRecord,
} from '@/lib/agent/turnState';
import {
  KEYS,
  TTL,
  acquireLock,
  claimOnce,
  get as redisGet,
  redisStatus,
  releaseLock,
  set as redisSet,
  type LockHandle,
} from '@/lib/redis';

/**
 * Turn orchestration for the LiveAvatar conversation.
 *
 * ## This is not an LLM endpoint
 *
 * HeyGen owns the LLM and the voice. The shopper's microphone goes straight to HeyGen
 * over LiveKit, HeyGen transcribes, answers and speaks. Nothing here generates the
 * avatar's reply, and no LLM key is required to run it.
 *
 * What this route does own is the application's side of a turn: identity, the state
 * machine, dedupe, the session lock, context preparation, memory, interruption and
 * latency diagnostics. It supports the conversation; it does not produce it.
 *
 * The response is SSE so the buffer can be delivered on the first frame while context
 * work continues behind it.
 */

export const dynamic = 'force-dynamic';

type Action = 'partial' | 'final' | 'interrupt' | 'answer_started' | 'answer_completed';

interface TurnRequest {
  sessionId?: string | null;
  turnId?: string | null;
  text?: string;
  action?: Action;
}

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function streamResponse(body: ReadableStream<Uint8Array>) {
  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

/** One-shot SSE reply for paths that finish without any async work. */
function immediate(event: string, data: unknown) {
  const encoder = new TextEncoder();
  return streamResponse(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sse(event, data)));
        controller.close();
      },
    })
  );
}

async function loadTurn(sessionId: string, turnId: string): Promise<TurnRecord | null> {
  return redisGet<TurnRecord>(KEYS.turnState(sessionId, turnId));
}

async function saveTurn(turn: TurnRecord): Promise<void> {
  await redisSet(KEYS.turnState(turn.sessionId, turn.turnId), turn, TTL.TURN_STATE);
}

export async function POST(request: Request) {
  let body: TurnRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const sessionId = body.sessionId?.trim() || null;
  const text = body.text?.trim() ?? '';
  const action: Action = body.action ?? 'final';
  const requestId = crypto.randomUUID();

  // An empty utterance is a normal artefact of VAD, not an error. Ignore it cheaply.
  // Only the transcript-carrying actions are subject to this: interrupt and the
  // answer-progress callbacks identify a turn by id and legitimately carry no text.
  const carriesTranscript = action === 'partial' || action === 'final';
  if (carriesTranscript && !text) {
    return immediate('ignored', { reason: 'empty_transcript', requestId, action });
  }

  // Partial transcripts are UI-only. No retrieval, no persistence, no buffer, no
  // Redis write — returning here is the entire point.
  if (action === 'partial') {
    return immediate('ignored', {
      reason: 'partial_transcript',
      requestId,
      sessionId,
      note: 'Partial transcripts do not open a turn.',
    });
  }

  if (!sessionId) {
    return Response.json({ error: 'sessionId is required' }, { status: 400 });
  }

  if (action === 'interrupt') {
    return handleInterrupt(sessionId, body.turnId ?? null, requestId);
  }

  if (action === 'answer_started' || action === 'answer_completed') {
    return handleAnswerProgress(sessionId, body.turnId ?? null, action, requestId);
  }

  return handleFinalTranscript(sessionId, text, requestId);
}

/**
 * Barge-in. Marks the turn INTERRUPTED so a delayed completion callback for it is
 * rejected by the state machine rather than overwriting the turn that replaced it.
 */
async function handleInterrupt(sessionId: string, turnId: string | null, requestId: string) {
  const now = Date.now();

  if (!turnId) {
    return immediate('interrupt', {
      sessionId,
      turnId: null,
      requestId,
      at: now,
      note: 'No active turn recorded; nothing to abandon.',
    });
  }

  const existing = await loadTurn(sessionId, turnId);
  if (!existing) {
    return immediate('interrupt', {
      sessionId,
      turnId,
      requestId,
      at: now,
      note: 'Turn not found in Redis; treating as already gone.',
    });
  }

  const result = transition(existing, 'INTERRUPTED', now);
  if (result.ok) {
    await saveTurn(result.turn);
  }

  return immediate('interrupt', {
    sessionId,
    turnId,
    requestId,
    at: now,
    state: result.turn.state,
    applied: result.ok,
    reason: result.ok ? null : result.reason,
    latency: measureTurn(result.turn),
  });
}

/**
 * HeyGen started or finished speaking the answer. Recorded for latency only — the
 * answer itself is entirely HeyGen's.
 */
async function handleAnswerProgress(
  sessionId: string,
  turnId: string | null,
  action: 'answer_started' | 'answer_completed',
  requestId: string
) {
  const now = Date.now();
  if (!turnId) {
    return immediate('ignored', { reason: 'no_turn_id', requestId, sessionId });
  }

  const existing = await loadTurn(sessionId, turnId);
  if (!existing) {
    return immediate('ignored', { reason: 'unknown_turn', requestId, sessionId, turnId });
  }

  const target = action === 'answer_started' ? 'ANSWER_STARTED' : 'ANSWER_COMPLETED';
  const result = transition(existing, target, now);

  if (!result.ok) {
    // This is the zombie-completion guard doing its job: an interrupted or failed turn
    // never becomes completed because a late callback arrived.
    return immediate('rejected', {
      requestId,
      sessionId,
      turnId,
      state: existing.state,
      attempted: target,
      reason: result.reason,
    });
  }

  const turn =
    action === 'answer_started'
      ? { ...result.turn, timings: { ...result.turn.timings, firstAudioAt: now } }
      : result.turn;

  await saveTurn(turn);

  return immediate('turn.state', {
    requestId,
    sessionId,
    turnId,
    state: turn.state,
    at: now,
    latency: measureTurn(turn),
  });
}

/**
 * A final transcript opens a turn.
 *
 * Order matters: the buffer goes out on the first SSE frame, before the dedupe check,
 * the lock, Redis or Postgres are touched. Everything after it is best-effort.
 */
function handleFinalTranscript(sessionId: string, text: string, requestId: string) {
  const encoder = new TextEncoder();
  const receivedAt = Date.now();
  const turnId = crypto.randomUUID();

  // Selected synchronously, from a pure module, before the stream even opens.
  const buffer = selectBuffer(text);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sse(event, data)));
      };

      // ---- FAST PATH: nothing above this line awaited anything. ----
      send('turn.started', { requestId, sessionId, turnId, at: receivedAt, text });
      send('buffer', {
        requestId,
        sessionId,
        turnId,
        at: Date.now(),
        id: buffer.id,
        text: buffer.text,
        delivery: buffer.delivery,
        audio: buffer.audio,
      });
      // ---- Everything below is support work and may fail without muting the avatar. ----

      let turn = createTurn(turnId, sessionId, text, receivedAt);
      turn.timings.bufferRequestedAt = receivedAt;
      const bufferStarted = transition(turn, 'BUFFER_STARTED', Date.now());
      if (bufferStarted.ok) turn = bufferStarted.turn;

      let lock: LockHandle | null = null;

      try {
        // Duplicate final-transcript events collapse onto the first turn.
        const fingerprint = transcriptFingerprint(text, receivedAt);
        const isFirst = await claimOnce(KEYS.turnDedupe(sessionId, fingerprint), TTL.DEDUPE);
        if (!isFirst) {
          send('duplicate', {
            requestId,
            sessionId,
            turnId,
            note: 'Duplicate final transcript; no second turn opened.',
          });
          return;
        }

        lock = await acquireLock(KEYS.sessionLock(sessionId), TTL.LOCK);
        if (!lock) {
          send('busy', {
            requestId,
            sessionId,
            turnId,
            note: 'Another turn holds the session lock.',
          });
          return;
        }

        const status = redisStatus();
        send('runtime', {
          requestId,
          backend: status.backend,
          redisAvailable: status.available,
          distributedLocking: status.distributedLocking,
          lockDistributed: lock.distributed,
        });

        turn.timings.contextStartedAt = Date.now();
        const context = await buildContext(text, sessionId);
        const contextReady = transition(turn, 'CONTEXT_READY', Date.now());
        if (contextReady.ok) turn = contextReady.turn;

        send('context', {
          requestId,
          sessionId,
          turnId,
          at: Date.now(),
          catalogue: context.catalogue.map((c) => ({ sku: c.sku, name: c.name })),
          snippets: context.snippets.map((s) => ({ title: s.title, heading: s.heading })),
          recentTurns: context.recentTurns.length,
          usage: context.usage,
          cache: context.cache,
          // Stated rather than implied: this packet is not being fed to any LLM here.
          delivery: 'not-injected',
          note:
            'HeyGen AgentType.FULL exposes no per-turn context injection; knowledge is ' +
            'bound at token mint via avatar_persona / context_id.',
        });

        await appendSessionMemory(sessionId, {
          who: 'SHOPPER',
          text,
          at: new Date(receivedAt).toISOString(),
        });

        await saveTurn(turn);

        send('turn.ready', {
          requestId,
          sessionId,
          turnId,
          state: turn.state,
          at: Date.now(),
          latency: measureTurn(turn),
        });
      } catch (err) {
        const detail = err instanceof Error ? err.message : 'Unknown turn error';
        const failed = transition(turn, 'FAILED', Date.now(), detail);
        if (failed.ok) {
          turn = failed.turn;
          await saveTurn(turn).catch(() => {});
        }

        // Support-side failure. The avatar is unaffected: HeyGen is still answering.
        await recordActivity({
          event: 'Turn orchestration failed',
          kind: LogKind.CHAT,
          status: LogStatus.ERROR,
          sessionId,
          model: 'liveavatar',
          detail: detail.slice(0, 500),
        }).catch(() => {});

        send('error', {
          requestId,
          sessionId,
          turnId,
          error: detail,
          note: 'Support work failed; the HeyGen conversation is unaffected.',
        });
      } finally {
        await releaseLock(lock).catch(() => {});
        controller.close();
      }
    },
  });

  return streamResponse(stream);
}

/** Runtime diagnostics. Reports what is actually configured, without secrets. */
export async function GET() {
  const status = redisStatus();

  return Response.json({
    role: 'turn-orchestration',
    llm: 'heygen',
    voice: 'heygen',
    geminiRequired: false,
    redis: {
      configured: status.configured,
      available: status.available,
      backend: status.backend,
      distributedLocking: status.distributedLocking,
      lastErrorAt: status.lastErrorAt,
    },
  });
}
