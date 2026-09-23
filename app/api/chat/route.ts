import { NextResponse } from 'next/server';
import { LogKind } from '@/app/generated/prisma';
import { recordActivity } from '@/lib/activity';
import { answerFromRedisContext } from '@/lib/redisAvatarAnswer';

/** Legacy source lookup. HeyGen handles live conversation answers. */

const MAX_MESSAGE_CHARS = 2_000;

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const rawMessage = body.message;
  if (typeof rawMessage !== 'string' || !rawMessage.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }

  const message = rawMessage.trim().slice(0, MAX_MESSAGE_CHARS);
  // Optional: lets a turn be traced back to the conversation it belongs to in the logs.
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.slice(0, 200) : null;

  const startedAt = Date.now();

/* progress step 2 */
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.slice(0, 200) : null;

  const startedAt = Date.now();

  try {
    const answer = await answerFromRedisContext(message);
    const latencyMs = Date.now() - startedAt;

    void recordActivity({
      event: message.slice(0, 120),
      kind: LogKind.CHAT,
      sessionId,
      model: 'redis-context',
      latencyMs,
      detail: `${answer.source} · ${answer.context.knowledgeRows} knowledge · ${answer.context.catalogueRows} sku`,
    }).catch((err) => console.warn('[chat] activity log failed', err));

    return NextResponse.json({
      response: answer.response,
      sources: [
        {
          id: answer.context.matchedId ?? answer.source,
          title: answer.source,
          category: 'redis-context',
          score: answer.context.matchedId ? 1 : 0,
        },
      ],
      context: answer.context,
    });
  } catch (err) {
    console.error('[chat] redis context answer failed', err);
    return NextResponse.json({ error: 'Could not read avatar context' }, { status: 503 });
  }
}