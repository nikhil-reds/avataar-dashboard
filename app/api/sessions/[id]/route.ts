import { NextResponse } from 'next/server';
import { LogKind, LogStatus, Prisma } from '@/app/generated/prisma';
import { prisma } from '@/lib/db';
import { recordActivity } from '@/lib/activity';
import { getConversation } from '@/lib/conversations';
import { parseUpdateSession } from '@/lib/validation';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getConversation(id);

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json(session);
}

/** Close a conversation, or attach a summary to it. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = parseUpdateSession(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const existing = await prisma.shopperSession.findUnique({
    where: { id },
    select: { startedAt: true, status: true },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const { status, summary, endedAt } = parsed.value;
  const data: Prisma.ShopperSessionUpdateInput = {};

  if (summary !== null) data.summary = summary;

  if (status) {
    // Duration is derived here rather than at read time so the admin console can sort
    // on it with an index.
    const closedAt = endedAt ?? new Date();
    data.status = status;
    data.endedAt = closedAt;
    data.durationSec = Math.max(
      0,
      Math.round((closedAt.getTime() - existing.startedAt.getTime()) / 1000)
    );
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const updated = await prisma.shopperSession.update({
    where: { id },
    data,
    select: { id: true, status: true, endedAt: true, durationSec: true, summary: true },
  });

  if (status) {
    await recordActivity({
      event: 'Avatar session ended',
      kind: LogKind.SESSION,
      status: status === 'ERROR' ? LogStatus.ERROR : LogStatus.OK,
      sessionId: id,
      model: 'liveavatar',
      latencyMs: updated.durationSec === null ? null : updated.durationSec * 1000,
    });
  }

  return NextResponse.json(updated);
}

/** Erase a conversation. Turns and retained facts cascade. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await prisma.shopperSession.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
