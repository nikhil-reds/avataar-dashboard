import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { LogKind, Prisma } from '@/app/generated/prisma';
import { recordActivity } from '@/lib/activity';
import {
  deactivateKnowledge,
  destroyKnowledge,
  getKnowledge,
  updateKnowledge,
} from '@/lib/knowledge';
import { refreshAvatarContextCache } from '@/lib/avatarContextCache';
import { parseKnowledgePatch } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/** Prisma's "record not found" for an update or delete against a missing id. */
function isMissingRecord(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025';
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const record = await getKnowledge(id);
    if (!record) {
      return NextResponse.json({ error: 'Knowledge entry not found' }, { status: 404 });
    }
    return NextResponse.json(record);
  } catch (err) {
    console.error('[knowledge] read failed', err);
    return NextResponse.json({ error: 'Could not load the knowledge entry' }, { status: 500 });
  }
}

/** Update any subset of an entry's fields, including toggling `isActive`. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = parseKnowledgePatch(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const updated = await updateKnowledge(id, parsed.value);

    await recordActivity({
      event: `Knowledge updated: ${updated.title ?? updated.id}`,
      kind: LogKind.INGEST,
      model: 'knowledge',
      detail: updated.isActive ? 'active' : 'inactive',
    });
    void refreshAvatarContextCache().catch((err) => console.warn('[redis] context refresh failed', err));

    return NextResponse.json(updated);
  } catch (err) {
    if (isMissingRecord(err)) {
      return NextResponse.json({ error: 'Knowledge entry not found' }, { status: 404 });
    }
    console.error('[knowledge] update failed', err);
    return NextResponse.json({ error: 'Could not update the knowledge entry' }, { status: 500 });
  }
}

/**
 * Deactivate an entry, which takes it out of the avatar's reach while leaving it visible
 * and restorable in the admin list. `?hard=true` erases it instead.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hard = request.nextUrl.searchParams.get('hard') === 'true';

  try {
    if (hard) {
      await destroyKnowledge(id);
      await recordActivity({
        event: 'Knowledge deleted',
        kind: LogKind.INGEST,
        model: 'knowledge',
        detail: id,
      });
      void refreshAvatarContextCache().catch((err) => console.warn('[redis] context refresh failed', err));
      return NextResponse.json({ ok: true, deleted: true });
    }

    const deactivated = await deactivateKnowledge(id);
    await recordActivity({
      event: `Knowledge deactivated: ${deactivated.title ?? deactivated.id}`,
      kind: LogKind.INGEST,
      model: 'knowledge',
      detail: deactivated.category,
    });
    void refreshAvatarContextCache().catch((err) => console.warn('[redis] context refresh failed', err));

    return NextResponse.json(deactivated);
  } catch (err) {
    if (isMissingRecord(err)) {
      return NextResponse.json({ error: 'Knowledge entry not found' }, { status: 404 });
    }
    console.error('[knowledge] delete failed', err);
    return NextResponse.json({ error: 'Could not remove the knowledge entry' }, { status: 500 });
  }
}
