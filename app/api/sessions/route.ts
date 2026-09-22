import { NextResponse } from 'next/server';
import { LogKind } from '@/app/generated/prisma';
import { prisma } from '@/lib/db';
import { recordActivity } from '@/lib/activity';
import { listConversations } from '@/lib/conversations';
import { parseConversationQuery, type RawSearchParams } from '@/lib/conversationQuery';
import { parseCreateSession } from '@/lib/validation';

/**
 * Open a conversation record. Called once the LiveAvatar session is connected, so the
 * HeyGen session id can be stored alongside it.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = parseCreateSession(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { avatarSessionId, locale } = parsed.value;

  // A reconnect reuses the same HeyGen session id; reuse our row rather than
  // splitting one conversation across two records.
  if (avatarSessionId) {
    const existing = await prisma.shopperSession.findUnique({
      where: { avatarSessionId },
      select: { id: true },
    });
    if (existing) return NextResponse.json({ id: existing.id }, { status: 200 });
  }

  const session = await prisma.shopperSession.create({
    data: { avatarSessionId, locale },
    select: { id: true, startedAt: true },
  });

  await recordActivity({
    event: 'Avatar session started',
    kind: LogKind.SESSION,
    sessionId: session.id,
    model: 'liveavatar',
    detail: locale,
  });

  return NextResponse.json(session, { status: 201 });
}

/** Admin listing. Filtering, sorting and paging all happen in Postgres. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw: RawSearchParams = Object.fromEntries(url.searchParams.entries());
  const query = parseConversationQuery(raw);

  const { rows, total, pageCount, perPage } = await listConversations(query);

  return NextResponse.json({ rows, total, pageCount, perPage, page: query.page });
}
