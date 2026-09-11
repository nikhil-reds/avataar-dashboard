import { NextResponse } from 'next/server';
import { LogKind, RenderState } from '@prisma/client';
import { prisma } from '@/lib/db';
import { recordActivity } from '@/lib/activity';

const MAX_SCRIPT = 4000;

/**
 * Queue a render request.
 *
 * The row is created in QUEUED and stays there: no render worker is wired up yet, so
 * nothing advances it. It is recorded rather than simulated, so the queue reflects the
 * requests that were actually made.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const script = typeof record.script === 'string' ? record.script.trim() : '';
  const voice = typeof record.voice === 'string' ? record.voice.trim() : '';

  if (!script) return NextResponse.json({ error: 'script is required' }, { status: 400 });
  if (!voice) return NextResponse.json({ error: 'voice is required' }, { status: 400 });

  const created = await prisma.avatarRender.create({
    data: {
      script: script.slice(0, MAX_SCRIPT),
      voice: voice.slice(0, 120),
      state: RenderState.QUEUED,
    },
    select: { id: true, state: true },
  });

  await recordActivity({
    event: 'Render queued: ' + script.slice(0, 80),
    kind: LogKind.RENDER,
    model: voice,
    detail: 'No render worker configured; job remains queued.',
  });

  return NextResponse.json(created, { status: 201 });
}
