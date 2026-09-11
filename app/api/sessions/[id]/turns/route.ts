import { NextResponse } from 'next/server';
import { LogKind, SessionStatus, SpeakerRole } from '@prisma/client';
import { prisma } from '@/lib/db';
import { recordActivity } from '@/lib/activity';
import { deriveTitle } from '@/lib/conversationQuery';
import { parseTurnsBatch, type TurnInput } from '@/lib/validation';

/** How long after a session ends a late flush is still accepted. */
const LATE_FLUSH_GRACE_MS = 5 * 60 * 1000;

/**
 * Append a batch of transcript turns.
 *
 * Turns arrive batched rather than one request per utterance: a live conversation fires
 * transcription events constantly, and a request per event means dozens of in-flight
 * requests racing each other, where a dropped one silently loses a turn.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = parseTurnsBatch(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const session = await prisma.shopperSession.findUnique({
    where: { id },
    select: { id: true, title: true, status: true, endedAt: true },
  });

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // The unload beacon can land just after the session was marked ended, so a short
  // grace window is allowed — but a long-closed session stops accepting writes.
  if (session.status !== SessionStatus.LIVE && session.endedAt) {
    const age = Date.now() - session.endedAt.getTime();
    if (age > LATE_FLUSH_GRACE_MS) {
      return NextResponse.json({ error: 'Session is closed' }, { status: 409 });
    }
  }

  const turns = parsed.value;

  // `skipDuplicates` makes a retried flush idempotent: the unique `eventId` absorbs
  // rows that already landed, so only genuinely new turns are counted.
  const inserted = await prisma.sessionTurn.createMany({
    data: turns.map((turn) => ({ ...turn, sessionId: id })),
    skipDuplicates: true,
  });

  const firstQuestion = turns.find((turn) => turn.who === SpeakerRole.SHOPPER);
  const lastSpokenAt = turns.reduce(
    (latest, turn) => (turn.spokenAt > latest ? turn.spokenAt : latest),
    turns[0].spokenAt
  );

  if (inserted.count > 0) {
    await prisma.shopperSession.update({
      where: { id },
      data: {
        turnCount: { increment: inserted.count },
        lastTurnAt: lastSpokenAt,
        ...(session.title === null && firstQuestion
          ? { title: deriveTitle(firstQuestion.text) }
          : {}),
      },
    });
  }

  if (inserted.count > 0) await logAnsweredQuestions(id, turns);

  return NextResponse.json({ inserted: inserted.count, received: turns.length });
}

/**
 * Record how long the avatar took to answer each question.
 *
 * This is a genuine measurement — the gap between the shopper's utterance and the
 * avatar's reply — rather than an estimate, which is why it is derived from the stored
 * timestamps instead of being timed at the request.
 */
async function logAnsweredQuestions(sessionId: string, turns: TurnInput[]) {
  const ordered = [...turns].sort((a, b) => a.seq - b.seq);

  // A question can be flushed in one batch and its answer in the next, so when a batch
  // opens with an avatar turn, look back for the question it belongs to.
  let pendingQuestion: { text: string; spokenAt: Date } | null = null;
  if (ordered[0].who !== SpeakerRole.SHOPPER) {
    const previous = await prisma.sessionTurn.findFirst({
      where: { sessionId, seq: { lt: ordered[0].seq }, who: SpeakerRole.SHOPPER },
      orderBy: { seq: 'desc' },
      select: { text: true, spokenAt: true },
    });
    if (previous) pendingQuestion = previous;
  }

  for (const turn of ordered) {
    if (turn.who === SpeakerRole.SHOPPER) {
      pendingQuestion = { text: turn.text, spokenAt: turn.spokenAt };
      continue;
    }

    if (turn.who !== SpeakerRole.AVATAR || !pendingQuestion) continue;

    const question = pendingQuestion;
    // Only the first answer segment measures response time; later segments are the
    // avatar still talking, not the shopper still waiting.
    pendingQuestion = null;

    const latencyMs = turn.spokenAt.getTime() - question.spokenAt.getTime();
    if (latencyMs < 0) continue;

    await recordActivity({
      event: question.text.slice(0, 120),
      kind: LogKind.CHAT,
      sessionId,
      model: 'liveavatar',
      latencyMs,
      detail: turn.text.slice(0, 300),
    });
  }
}
