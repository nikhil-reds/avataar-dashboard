import { NextResponse } from 'next/server';
import { LogKind } from '@prisma/client';
import { prisma } from '@/lib/db';
import { recordActivity } from '@/lib/activity';
import { getSource, toSourceRow } from '@/lib/ingest';
import { deleteObject } from '@/lib/storage';

/** One source, with its decoded text — the only endpoint that returns the document body. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const source = await getSource(id);

  if (!source) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 });
  }

  return NextResponse.json({
    source: toSourceRow(source, source.text !== null),
    text: source.text,
    checksum: source.checksum,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const source = await prisma.ingestSource.findUnique({
    where: { id },
    select: { id: true, title: true, storagePath: true },
  });

  if (!source) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 });
  }

  // The row goes first. An orphaned file on disk is recoverable housekeeping; a row
  // pointing at a file that no longer exists breaks every read of it.
  await prisma.ingestSource.delete({ where: { id } });

  if (source.storagePath) {
    try {
      await deleteObject(source.storagePath);
    } catch (err) {
      console.error('[ingest] stored file left behind', source.storagePath, err);
    }
  }

  await recordActivity({
    event: `Ingest source deleted: ${source.title}`,
    kind: LogKind.INGEST,
    model: 'admin',
    detail: id,
  });

  return NextResponse.json({ deleted: id });
}
