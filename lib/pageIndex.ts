// Builds the JSON page index stored for /admin/ingest. Pure functions only — no I/O,
// no React, no Prisma — so the API route, the browser and any future extraction worker
// all split documents the same way. (Not to be confused with components/lib/pageindex.ts,
// which calls the PageIndex retrieval endpoint.)

import type {
  IndexableSource,
  PageIndexDoc,
  PageIndexDocument,
  PageIndexNode,
} from '../types';

export const PAGE_INDEX_VERSION = '1.0';

/** 25 MB. An upload is buffered whole before it is written, so this is a real ceiling. */
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

/** Longest section we keep whole; anything larger is split on word boundaries. */
const MAX_SECTION_CHARS = 1200;

const PREVIEW_CHARS = 160;

export const PENDING_EXTRACTION_NOTE =
  'Content needs a server-side extractor; only metadata is indexed.';

interface ExtensionSpec {
  mime: string;
  /** Text-like formats decode as UTF-8 on upload; the rest need an extractor. */
  readable: boolean;
  label: string;
}

/**
 * Formats the upload control accepts. Word and PDF are listed as not `readable`:
 * they are staged and indexed as metadata, awaiting a server-side extractor.
 */
export const SUPPORTED_EXTENSIONS: Record<string, ExtensionSpec> = {
  pdf: { mime: 'application/pdf', readable: false, label: 'PDF' },
  doc: { mime: 'application/msword', readable: false, label: 'Word' },
  docx: {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    readable: false,
    label: 'Word',
  },
  rtf: { mime: 'application/rtf', readable: false, label: 'RTF' },
  xlsx: {
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    readable: false,
    label: 'Excel',
  },
  txt: { mime: 'text/plain', readable: true, label: 'Text' },
  md: { mime: 'text/markdown', readable: true, label: 'Markdown' },
  csv: { mime: 'text/csv', readable: true, label: 'CSV' },
};

export const ACCEPT_ATTRIBUTE = Object.keys(SUPPORTED_EXTENSIONS)
  .map((ext) => `.${ext}`)
  .join(',');

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  if (dot < 0 || dot === fileName.length - 1) return '';
  return fileName.slice(dot + 1).toLowerCase();
}

export function specForFile(fileName: string): ExtensionSpec | null {
  return SUPPORTED_EXTENSIONS[extensionOf(fileName)] ?? null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** Markdown ATX heading (`## Title`) or a short underline-free line acting as one. */
function headingOf(block: string): { heading: string; depth: number } | null {
  const firstLine = block.split('\n', 1)[0].trim();
  if (!firstLine) return null;

  const atx = /^(#{1,6})\s+(.*)$/.exec(firstLine);
  if (atx) return { heading: atx[2].trim(), depth: atx[1].length };

  // A short, unpunctuated opening line reads as a heading in pasted prose.
  const isShort = firstLine.length <= 80 && !/[.!?,;:]$/.test(firstLine);
  if (isShort && block.includes('\n')) return { heading: firstLine, depth: 2 };

  return null;
}

function previewOf(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= PREVIEW_CHARS) return flat;
  return `${flat.slice(0, PREVIEW_CHARS).trimEnd()}…`;
}

/**
 * Splits a chunk that has no internal structure, on word boundaries, so a wall of
 * text still yields navigable nodes instead of one enormous one.
 */
function splitLongBlock(
  text: string,
  offset: number
): { text: string; start: number }[] {
  const parts: { text: string; start: number }[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    if (text.length - cursor <= MAX_SECTION_CHARS) {
      parts.push({ text: text.slice(cursor), start: offset + cursor });
      break;
    }

    const window = text.slice(cursor, cursor + MAX_SECTION_CHARS);
    const breakAt = window.lastIndexOf(' ');
    const take = breakAt > MAX_SECTION_CHARS * 0.5 ? breakAt : window.length;
    parts.push({ text: text.slice(cursor, cursor + take), start: offset + cursor });
    cursor += take;
  }

  return parts;
}

/**
 * Splits document text into page-index nodes on blank lines, keeping character
 * offsets into the original so a node can be traced back to its source.
 */
export function splitIntoSections(text: string, docId: string): PageIndexNode[] {
  const nodes: PageIndexNode[] = [];
  if (!text.trim()) return nodes;

  // Offsets must point into the original string, so walk it rather than using
  // split(), which would discard how long each separator was.
  const blocks: { text: string; start: number }[] = [];
  const separator = /\n[ \t]*\n+/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = separator.exec(text)) !== null) {
    blocks.push({ text: text.slice(cursor, match.index), start: cursor });
    cursor = match.index + match[0].length;
  }
  blocks.push({ text: text.slice(cursor), start: cursor });

  // Markdown puts a heading in its own block. On its own it would index as a
  // two-word section, and the prose under it would lose its title, so fold the
  // pair together — offsets stay contiguous because both come from `text`.
  const merged: { text: string; start: number }[] = [];
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    const next = blocks[i + 1];
    const isLoneHeading = !block.text.includes('\n') && /^\s*#{1,6}\s+\S/.test(block.text);

    if (isLoneHeading && next) {
      const end = next.start + next.text.length;
      merged.push({ text: text.slice(block.start, end), start: block.start });
      i += 1;
      continue;
    }

    merged.push(block);
  }

  for (const block of merged) {
    if (!block.text.trim()) continue;

    const parts =
      block.text.length > MAX_SECTION_CHARS
        ? splitLongBlock(block.text, block.start)
        : [block];

    parts.forEach((part, partIndex) => {
      if (!part.text.trim()) return;

      const detected = partIndex === 0 ? headingOf(part.text) : null;
      const index = nodes.length + 1;

      // The heading is already its own field; repeating it in the preview (markup
      // and all) wastes the two lines the tree has for showing what is inside.
      const body = detected ? part.text.slice(part.text.indexOf('\n') + 1) : part.text;
      const previewSource = detected && body.trim() ? body : part.text;

      nodes.push({
        id: `${docId}_n${index}`,
        depth: detected?.depth ?? 1,
        heading: detected?.heading ?? `Section ${index}`,
        start: part.start,
        end: part.start + part.text.length,
        words: countWords(part.text),
        preview: previewOf(previewSource),
      });
    });
  }

  return nodes;
}

function documentFor(source: IndexableSource, index: number): PageIndexDocument {
  const id = `doc_${index + 1}`;

  const base = {
    id,
    sourceId: source.id,
    title: source.title,
    kind: source.kind.toLowerCase() as PageIndexDocument['kind'],
    mime: source.mime,
    sizeBytes: source.sizeBytes,
  };

  if (source.unavailable === 'error') {
    return {
      ...base,
      status: 'error',
      note: source.note ?? 'Could not read this source',
      nodes: [],
    };
  }

  if (source.unavailable === 'pending_extraction' || typeof source.text !== 'string') {
    return {
      ...base,
      status: 'pending_extraction',
      note: source.note ?? PENDING_EXTRACTION_NOTE,
      nodes: [],
    };
  }

  const nodes = splitIntoSections(source.text, id);

  return {
    ...base,
    status: 'indexed',
    stats: {
      chars: source.text.length,
      words: countWords(source.text),
      sections: nodes.length,
    },
    nodes,
  };
}

/**
 * Assembles the page index. `generatedAt` is passed in rather than read from the clock
 * so the result stays a pure function of its input, and re-indexing the same sources
 * with the same timestamp produces the same document.
 */
export function buildPageIndex(
  sources: IndexableSource[],
  generatedAt: string
): PageIndexDoc {
  return {
    version: PAGE_INDEX_VERSION,
    generatedAt,
    sourceCount: sources.length,
    documents: sources.map(documentFor),
  };
}
