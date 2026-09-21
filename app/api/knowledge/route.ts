import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { LogKind, LogStatus } from '@/app/generated/prisma';
import { recordActivity } from '@/lib/activity';
import {
  KNOWLEDGE_PAGE_SIZE,
  createKnowledge,
  listKnowledge,
  listKnowledgeCategories,
  type KnowledgeStatusFilter,
} from '@/lib/knowledge';
import { refreshAvatarContextCache } from '@/lib/avatarContextCache';
import { parseKnowledgeInput } from '@/lib/validation';

// Reads and writes must both see the current table on every request: knowledge added in
// the admin console has to reach the avatar's next question without a rebuild.
export const dynamic = 'force-dynamic';

function parseStatus(value: string | null): KnowledgeStatusFilter {
  return value === 'active' || value === 'inactive' ? value : 'all';
}

function parseCount(value: string | null, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(Math.trunc(parsed), max);
}

/** List knowledge, optionally filtered by search term, category and active state. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  try {
    const [{ rows, total, matching }, categories] = await Promise.all([
      listKnowledge({
        q: (params.get('q') ?? '').trim().slice(0, 200),
        category: (params.get('category') ?? '').trim().slice(0, 80),
        status: parseStatus(params.get('status')),
        limit: parseCount(params.get('limit'), KNOWLEDGE_PAGE_SIZE, KNOWLEDGE_PAGE_SIZE),
        skip: parseCount(params.get('skip'), 0, 10_000),
      }),
      listKnowledgeCategories(),
    ]);

    return NextResponse.json({ rows, total, matching, categories });
  } catch (err) {
    console.error('[knowledge] list failed', err);
    return NextResponse.json({ error: 'Could not load knowledge' }, { status: 500 });
  }
}

/** Add a knowledge entry. Live for the avatar as soon as it returns. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = parseKnowledgeInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const created = await createKnowledge(parsed.value);

    await recordActivity({
      event: `Knowledge added: ${created.title ?? created.id}`,
      kind: LogKind.INGEST,
      model: 'knowledge',
      detail: created.category,
    });
    void refreshAvatarContextCache().catch((err) => console.warn('[redis] context refresh failed', err));

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    // The driver's message can carry connection strings and column detail, so only a
    // generic line crosses the wire; the real error stays in the server log.
    console.error('[knowledge] create failed', err);

    await recordActivity({
      event: 'Knowledge entry failed',
      kind: LogKind.INGEST,
      status: LogStatus.ERROR,
      model: 'knowledge',
      detail: parsed.value.title,
    });

    return NextResponse.json({ error: 'Could not save the knowledge entry' }, { status: 500 });
  }
}
