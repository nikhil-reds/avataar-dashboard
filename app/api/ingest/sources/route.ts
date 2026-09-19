import { NextResponse } from 'next/server';
import { IngestSourceKind, IngestSourceStatus, LogKind, LogStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { recordActivity } from '@/lib/activity';
import { decodeTextFile, listSources, SOURCE_SELECT, toSourceRow } from '@/lib/ingest';
import { checksumOf, putObject } from '@/lib/storage';
import {
  extensionOf,
  MAX_SOURCE_BYTES,
  PENDING_EXTRACTION_NOTE,
  specForFile,
} from '@/lib/pageIndex';
import { parseTextSource } from '@/lib/validation';
import type { IngestSourceRow } from '@/types';

interface Rejection {
  name: string;
  reason: string;
}

/**
 * Stage a source: `multipart/form-data` uploads one or more files, JSON adds pasted
 * text. Both land in the same table, because an index does not care where a document
 * came from — only whether its text is readable yet.
 */
export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    return handleUpload(request);
  }

  return handlePastedText(request);
}

async function handleUpload(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart body' }, { status: 400 });
  }

  const files = [...form.getAll('files'), ...form.getAll('file')].filter(
    (entry): entry is File => entry instanceof File
  );

  if (files.length === 0) {
    return NextResponse.json({ error: 'No files were uploaded' }, { status: 400 });
  }

  const created: IngestSourceRow[] = [];
  const rejected: Rejection[] = [];

  for (const file of files) {
    // The browser enforces the same rules, but it is not the only possible caller.
    const spec = specForFile(file.name);
    if (!spec) {
      rejected.push({ name: file.name, reason: 'Unsupported file type' });
      continue;
    }

    if (file.size > MAX_SOURCE_BYTES) {
      rejected.push({ name: file.name, reason: 'File exceeds the 25 MB limit' });
      continue;
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    // `file.size` is the client's claim; the buffer is what was actually received.
    if (bytes.byteLength > MAX_SOURCE_BYTES) {
      rejected.push({ name: file.name, reason: 'File exceeds the 25 MB limit' });
      continue;
    }

    const checksum = checksumOf(bytes);

    // Identical bytes are almost always a re-drop of a file already on the bench.
    // Storing a second copy would duplicate the document in every index built over it.
    const duplicate = await prisma.ingestSource.findFirst({
      where: { checksum },
      select: { title: true },
    });

    if (duplicate) {
      rejected.push({
        name: file.name,
        reason: `Already stored as "${duplicate.title}"`,
      });
      continue;
    }

    try {
      const storagePath = await putObject(bytes, extensionOf(file.name));
      const text = spec.readable ? decodeTextFile(bytes) : null;

      const record = await prisma.ingestSource.create({
        data: {
          kind: IngestSourceKind.FILE,
          title: file.name,
          fileName: file.name,
          mime: spec.mime,
          ext: extensionOf(file.name),
          sizeBytes: bytes.byteLength,
          checksum,
          storagePath,
          text,
          status: spec.readable
            ? IngestSourceStatus.STAGED
            : IngestSourceStatus.PENDING_EXTRACTION,
          note: spec.readable ? null : PENDING_EXTRACTION_NOTE,
        },
        select: SOURCE_SELECT,
      });

      created.push(toSourceRow(record, text !== null));

      await recordActivity({
        event: `Ingest source uploaded: ${file.name}`,
        kind: LogKind.INGEST,
        model: 'upload',
        detail: `${bytes.byteLength} bytes · ${spec.label}`,
      });
    } catch (err) {
      console.error('[ingest] upload failed', file.name, err);
      rejected.push({ name: file.name, reason: 'Could not store this file' });

      await recordActivity({
        event: 'Ingest source upload failed',
        kind: LogKind.INGEST,
        status: LogStatus.ERROR,
        model: 'upload',
        detail: file.name,
      });
    }
  }

  // Some files landing and others not is a normal outcome of a multi-file drop, so it
  // is reported in the body rather than as a failed request.
  return NextResponse.json(
    { created, rejected },
    { status: created.length ? 201 : 400 }
  );
}

async function handlePastedText(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = parseTextSource(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { title, body: text } = parsed.value;
  const bytes = Buffer.from(text, 'utf-8');

  const record = await prisma.ingestSource.create({
    data: {
      kind: IngestSourceKind.TEXT,
      title,
      mime: 'text/plain',
      sizeBytes: bytes.byteLength,
      checksum: checksumOf(bytes),
      // Pasted text has no object to store: the row holds the whole document.
      storagePath: null,
      text,
      status: IngestSourceStatus.STAGED,
    },
    select: SOURCE_SELECT,
  });

  await recordActivity({
    event: `Ingest source added: ${title}`,
    kind: LogKind.INGEST,
    model: 'paste',
    detail: `${text.length} chars`,
  });

  return NextResponse.json({ created: [toSourceRow(record, true)], rejected: [] }, {
    status: 201,
  });
}

/** Newest-first listing, used to rehydrate the staging bench. */
export async function GET() {
  const sources = await listSources();
  return NextResponse.json({ sources });
}
