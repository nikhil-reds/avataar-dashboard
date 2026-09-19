import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { objectSize, objectStream } from '@/lib/storage';

/**
 * Serves the original uploaded file back. Streamed rather than buffered, so a 25 MB
 * download does not sit in memory for the length of the response.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const source = await prisma.ingestSource.findUnique({
    where: { id },
    select: { fileName: true, title: true, mime: true, storagePath: true },
  });

  if (!source) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 });
  }

  if (!source.storagePath) {
    return NextResponse.json(
      { error: 'This source is pasted text and has no stored file' },
      { status: 404 }
    );
  }

  const size = await objectSize(source.storagePath);
  if (size === null) {
    return NextResponse.json({ error: 'Stored file is missing' }, { status: 410 });
  }

  // The filename is operator input, so it is quoted with quotes and control characters
  // stripped — an unescaped one would let a crafted name forge response headers.
  const name = (source.fileName ?? source.title).replace(/["\r\n]/g, '');

  return new Response(objectStream(source.storagePath), {
    headers: {
      'Content-Type': source.mime,
      'Content-Length': String(size),
      'Content-Disposition': `attachment; filename="${name}"`,
    },
  });
}
