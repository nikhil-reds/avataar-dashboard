// Object storage for uploaded ingest documents.
//
// Files are written to disk rather than a Postgres column: Prisma materialises a
// `Bytes` column in full on every read, and 25 MB rows land in every database dump.
// Everything here is keyed by an opaque string, so swapping the local directory for
// S3/R2 later means reimplementing this file and nothing else.

import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';

/** Overridable so a deployment can point at a mounted volume. */
const STORAGE_ROOT =
  process.env.INGEST_STORAGE_DIR ?? path.join(process.cwd(), 'storage');

const INGEST_PREFIX = 'ingest';

export function checksumOf(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Resolves a storage key to an absolute path, refusing anything that would escape the
 * storage root. Keys come from our own database, but a traversal here would read
 * arbitrary files off the server, so it is checked rather than assumed.
 */
function resolvePath(key: string): string {
  const absolute = path.resolve(/*turbopackIgnore: true*/ STORAGE_ROOT, key);
  const root = path.resolve(/*turbopackIgnore: true*/ STORAGE_ROOT);

  if (absolute !== root && !absolute.startsWith(root + path.sep)) {
    throw new Error(`Storage key escapes the storage root: ${key}`);
  }

  return absolute;
}

/**
 * Writes bytes under a generated key and returns it. The operator's filename is never
 * used on disk — it is untrusted input, and it is already stored on the row.
 */
export async function putObject(bytes: Buffer, ext: string): Promise<string> {
  const safeExt = /^[a-z0-9]{1,10}$/.test(ext) ? `.${ext}` : '';
  const key = `${INGEST_PREFIX}/${randomUUID()}${safeExt}`;
  const absolute = resolvePath(key);

  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, bytes);

  return key;
}

export async function objectSize(key: string): Promise<number | null> {
  try {
    const info = await stat(/*turbopackIgnore: true*/ resolvePath(key));
    return info.size;
  } catch {
    return null;
  }
}

/** Web stream for a route handler response, so a large file is not buffered whole. */
export function objectStream(key: string): ReadableStream<Uint8Array> {
  const nodeStream = createReadStream(/*turbopackIgnore: true*/ resolvePath(key));
  return Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
}

/** Deleting an object that is already gone is a success: the end state is the same. */
export async function deleteObject(key: string): Promise<void> {
  await rm(resolvePath(key), { force: true });
}
