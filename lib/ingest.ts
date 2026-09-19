// Database access for ingest sources and page index builds. Route handlers stay thin:
// they validate input and call into here, so the same queries are available to server
// components rendering the page.

import {
  IngestSourceKind,
  IngestSourceStatus,
  PageIndexDocStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from './db';
import { buildPageIndex } from './pageIndex';
import type {
  IndexableSource,
  IngestSourceRow,
  PageIndexBuildSummary,
  PageIndexDoc,
  PageIndexDocumentStatus,
} from '../types';

/** Columns every listing needs. `text` is excluded: it is large and rarely wanted. */
export const SOURCE_SELECT = {
  id: true,
  kind: true,
  title: true,
  fileName: true,
  mime: true,
  ext: true,
  sizeBytes: true,
  status: true,
  note: true,
  storagePath: true,
  createdAt: true,
} satisfies Prisma.IngestSourceSelect;

type SourceRecord = Prisma.IngestSourceGetPayload<{ select: typeof SOURCE_SELECT }> & {
  text?: string | null;
};

/**
 * Wire shape for a stored source. `hasText` is reported rather than the text itself so
 * a listing of fifty documents does not ship every document body to the browser.
 */
export function toSourceRow(
  record: SourceRecord,
  hasText: boolean
): IngestSourceRow {
  return {
    id: record.id,
    kind: record.kind,
    title: record.title,
    fileName: record.fileName,
    mime: record.mime,
    ext: record.ext,
    sizeBytes: record.sizeBytes,
    status: record.status,
    note: record.note,
    hasText,
    hasFile: record.storagePath !== null,
    createdAt: record.createdAt.toISOString(),
  };
}

export async function listSources(limit = 50): Promise<IngestSourceRow[]> {
  const records = await prisma.ingestSource.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { ...SOURCE_SELECT, text: true },
  });

  return records.map((record) => toSourceRow(record, record.text !== null));
}

export async function getSource(id: string) {
  return prisma.ingestSource.findUnique({
    where: { id },
    select: { ...SOURCE_SELECT, text: true, checksum: true },
  });
}

const STATUS_TO_UNAVAILABLE: Partial<
  Record<IngestSourceStatus, IndexableSource['unavailable']>
> = {
  [IngestSourceStatus.PENDING_EXTRACTION]: 'pending_extraction',
  [IngestSourceStatus.FAILED]: 'error',
};

/** Maps a stored row onto the shape the pure splitter consumes. */
function toIndexable(record: {
  id: string;
  kind: IngestSourceKind;
  title: string;
  mime: string;
  sizeBytes: number;
  status: IngestSourceStatus;
  note: string | null;
  text: string | null;
}): IndexableSource {
  return {
    id: record.id,
    kind: record.kind,
    title: record.title,
    mime: record.mime,
    sizeBytes: record.sizeBytes,
    text: record.text,
    unavailable: STATUS_TO_UNAVAILABLE[record.status],
    note: record.note,
  };
}

const DOC_STATUS_TO_DB: Record<PageIndexDocumentStatus, PageIndexDocStatus> = {
  indexed: PageIndexDocStatus.INDEXED,
  pending_extraction: PageIndexDocStatus.PENDING_EXTRACTION,
  error: PageIndexDocStatus.ERROR,
};

const DOC_STATUS_FROM_DB: Record<PageIndexDocStatus, PageIndexDocumentStatus> = {
  [PageIndexDocStatus.INDEXED]: 'indexed',
  [PageIndexDocStatus.PENDING_EXTRACTION]: 'pending_extraction',
  [PageIndexDocStatus.ERROR]: 'error',
};

export class MissingSourcesError extends Error {
  constructor(public readonly missing: string[]) {
    super(`Unknown source ids: ${missing.join(', ')}`);
    this.name = 'MissingSourcesError';
  }
}

/**
 * Builds a page index over the given sources and stores it.
 *
 * The whole build is one transaction: a half-written index — documents with no nodes,
 * or a build whose documents never landed — would read as a complete one.
 */
export async function createIndexBuild(
  sourceIds: string[],
  label: string | null
): Promise<PageIndexDoc> {
  const records = await prisma.ingestSource.findMany({
    where: { id: { in: sourceIds } },
    select: {
      id: true,
      kind: true,
      title: true,
      mime: true,
      sizeBytes: true,
      status: true,
      note: true,
      text: true,
    },
  });

  const byId = new Map(records.map((record) => [record.id, record]));
  const missing = sourceIds.filter((id) => !byId.has(id));
  if (missing.length) throw new MissingSourcesError(missing);

  // Index in the order the caller asked for, not the order Postgres returned.
  const ordered = sourceIds.map((id) => byId.get(id)!);
  const index = buildPageIndex(ordered.map(toIndexable), new Date().toISOString());

  const build = await prisma.$transaction(async (tx) => {
    const created = await tx.pageIndexBuild.create({
      data: {
        version: index.version,
        label,
        sourceCount: index.sourceCount,
        // Written explicitly rather than left to the column default: `generatedAt` is
        // already in the response, and a row stamped at insert time would send the
        // build back from GET with a timestamp a few milliseconds off the one the
        // caller was handed.
        createdAt: new Date(index.generatedAt),
      },
      select: { id: true, createdAt: true },
    });

    for (const [position, doc] of index.documents.entries()) {
      await tx.pageIndexDocument.create({
        data: {
          buildId: created.id,
          sourceId: doc.sourceId,
          ordinal: position + 1,
          title: doc.title,
          mime: doc.mime,
          sizeBytes: doc.sizeBytes,
          status: DOC_STATUS_TO_DB[doc.status],
          note: doc.note ?? null,
          chars: doc.stats?.chars ?? 0,
          words: doc.stats?.words ?? 0,
          sections: doc.stats?.sections ?? 0,
          nodes: {
            create: doc.nodes.map((node, nodePosition) => ({
              ordinal: nodePosition + 1,
              depth: node.depth,
              heading: node.heading,
              startChar: node.start,
              endChar: node.end,
              words: node.words,
              preview: node.preview,
            })),
          },
        },
      });
    }

    // A source that produced sections is indexed; one still awaiting an extractor
    // keeps the status it already had.
    const indexedIds = index.documents
      .filter((doc) => doc.status === 'indexed')
      .map((doc) => doc.sourceId);

    if (indexedIds.length) {
      await tx.ingestSource.updateMany({
        where: { id: { in: indexedIds } },
        data: { status: IngestSourceStatus.INDEXED },
      });
    }

    return created;
  });

  // Keys are listed rather than spread so this response and the one `getIndexBuild`
  // assembles serialise in the same order, and the two are diffable as text.
  return {
    version: index.version,
    generatedAt: index.generatedAt,
    sourceCount: index.sourceCount,
    buildId: build.id,
    label,
    documents: index.documents,
  };
}

/** Rebuilds the JSON for a stored build, in the same shape `createIndexBuild` returns. */
export async function getIndexBuild(id: string): Promise<PageIndexDoc | null> {
  const build = await prisma.pageIndexBuild.findUnique({
    where: { id },
    include: {
      documents: {
        orderBy: { ordinal: 'asc' },
        include: { nodes: { orderBy: { ordinal: 'asc' } }, source: { select: { kind: true } } },
      },
    },
  });

  if (!build) return null;

  return {
    version: build.version,
    generatedAt: build.createdAt.toISOString(),
    sourceCount: build.sourceCount,
    buildId: build.id,
    label: build.label,
    documents: build.documents.map((doc) => {
      const status = DOC_STATUS_FROM_DB[doc.status];

      return {
        id: `doc_${doc.ordinal}`,
        sourceId: doc.sourceId,
        title: doc.title,
        kind: doc.source.kind.toLowerCase() as 'file' | 'text',
        mime: doc.mime,
        sizeBytes: doc.sizeBytes,
        status,
        ...(doc.note ? { note: doc.note } : {}),
        ...(status === 'indexed'
          ? { stats: { chars: doc.chars, words: doc.words, sections: doc.sections } }
          : {}),
        nodes: doc.nodes.map((node) => ({
          id: `doc_${doc.ordinal}_n${node.ordinal}`,
          depth: node.depth,
          heading: node.heading,
          start: node.startChar,
          end: node.endChar,
          words: node.words,
          preview: node.preview,
        })),
      };
    }),
  };
}

export async function listIndexBuilds(limit = 20): Promise<PageIndexBuildSummary[]> {
  const builds = await prisma.pageIndexBuild.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      documents: { select: { _count: { select: { nodes: true } } } },
    },
  });

  return builds.map((build) => ({
    id: build.id,
    version: build.version,
    label: build.label,
    sourceCount: build.sourceCount,
    documentCount: build.documents.length,
    nodeCount: build.documents.reduce((total, doc) => total + doc._count.nodes, 0),
    createdAt: build.createdAt.toISOString(),
  }));
}

export async function latestIndexBuild(): Promise<PageIndexDoc | null> {
  const latest = await prisma.pageIndexBuild.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  return latest ? getIndexBuild(latest.id) : null;
}

/**
 * Decodes an uploaded text-like file as UTF-8.
 *
 * NUL bytes are stripped because Postgres rejects them in a text column: left in, a
 * single stray byte in a CSV would fail the insert rather than the file being stored.
 */
const NUL = String.fromCharCode(0);
const BYTE_ORDER_MARK = String.fromCharCode(0xfeff);

export function decodeTextFile(bytes: Buffer): string {
  const decoded = new TextDecoder('utf-8').decode(bytes).split(NUL).join('');
  return decoded.startsWith(BYTE_ORDER_MARK) ? decoded.slice(1) : decoded;
}
