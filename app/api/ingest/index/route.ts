import { NextResponse } from 'next/server';
import { LogKind, LogStatus } from '@/app/generated/prisma';
import { recordActivity } from '@/lib/activity';
import { KEYS, del as cacheDel } from '@/lib/redis';
import { createIndexBuild, listIndexBuilds, MissingSourcesError } from '@/lib/ingest';
import { parseIndexBuild } from '@/lib/validation';

/** Build a page index over the named sources and store it. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = parseIndexBuild(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { sourceIds, label } = parsed.value;
  const startedAt = Date.now();

  try {
    const index = await createIndexBuild(sourceIds, label);
    await cacheDel(KEYS.pageIndexSummary());

    const sections = index.documents.reduce((total, doc) => total + doc.nodes.length, 0);

    await recordActivity({
      event: `Page index built: ${index.documents.length} documents`,
      kind: LogKind.INGEST,
      model: 'pageindex',
      latencyMs: Date.now() - startedAt,
      detail: `${sections} sections · build ${index.buildId}`,
    });

    return NextResponse.json(index, { status: 201 });
  } catch (err) {
    if (err instanceof MissingSourcesError) {
      return NextResponse.json(
        { error: `Unknown source ids: ${err.missing.join(', ')}` },
        { status: 404 }
      );
    }

    console.error('[ingest] index build failed', err);

    await recordActivity({
      event: 'Page index build failed',
      kind: LogKind.INGEST,
      status: LogStatus.ERROR,
      model: 'pageindex',
      detail: sourceIds.join(', ').slice(0, 300),
    });

    return NextResponse.json({ error: 'Could not build the page index' }, { status: 500 });
  }
}

/** Build history, newest first. */
export async function GET() {
  const builds = await listIndexBuilds();
  return NextResponse.json({ builds });
}
