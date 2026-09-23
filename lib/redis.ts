import { redisTcpCommand } from './redisTcp';
/**
 * The single Redis abstraction for the app.
 *
 * Uses Docker Redis through REDIS_URL, or the Upstash REST API when configured.
 * TCP connections are bounded and closed after each command.
 *
 * ## Honesty about the fallback
 *
 * When Redis is not configured or is unreachable, this module degrades to a
 * process-local `Map`. That fallback is NOT equivalent to Redis and never claims to
 * be: `redisStatus().backend` reports `'memory'`, `distributedLocking` reports
 * `false`, and every lock handed out in that mode is marked `distributed: false`.
 * Two workers running the memory fallback do not share state, and callers that need
 * real mutual exclusion must check the flag rather than assume it.
 */

const CONNECT_TIMEOUT_MS = 2_000;

/** TTLs, in seconds. Centralised so the retention story is readable in one place. */
export const TTL = {
  /** Rolling conversation memory for a live session. */
  SESSION_MEMORY: 2 * 24 * 60 * 60,
  /** Recent transcript turns for a live session. */
  SESSION_TURNS: 2 * 24 * 60 * 60,
  /** Cross-session memory for a returning shopper. */
  SHOPPER_MEMORY: 2 * 24 * 60 * 60,
  /** Per-turn state machine record. Outlives the turn for late-callback rejection. */
  TURN_STATE: 30 * 60,
  /** Compact retrieval context for a repeated query. */
  QUERY_CONTEXT: 10 * 60,
  /** Page-index summary — rebuilt on ingest, so this is only a safety net. */
  PAGEINDEX: 60 * 60,
  /** Catalogue index — invalidated on SKU write, so this is only a safety net. */
  CATALOGUE: 60 * 60,
  /** Persona is long-lived and explicitly invalidated when the admin saves. */
  PERSONA: 24 * 60 * 60,
  /** Turn lock. Short, so a crashed worker cannot deadlock a session for long. */
  LOCK: 20,
  /** Final-transcript dedupe marker. */
  DEDUPE: 2 * 60,
} as const;

/**
 * Key namespace. Every key the app uses is built here so there is one place to audit
 * for accidental collisions between shoppers.
 */
export const KEYS = {
  persona: () => 'persona:default',
  catalogueIndex: () => 'catalogue:index:v1',
  pageIndexSummary: () => 'pageindex:latest:summary',
  /** `hash` must already fold in every input that changes the result. */
  queryContext: (hash: string) => `queryctx:${hash}`,
  sessionMemory: (sessionId: string) => `session:${sessionId}:memory`,
  sessionTurns: (sessionId: string) => `session:${sessionId}:turns`,
  sessionLock: (sessionId: string) => `session:${sessionId}:lock`,
  sessionState: (sessionId: string) => `session:${sessionId}:state`,
  turnState: (sessionId: string, turnId: string) => `session:${sessionId}:turn:${turnId}`,
  turnDedupe: (sessionId: string, fingerprint: string) =>
    `session:${sessionId}:dedupe:${fingerprint}`,
  shopperMemory: (fingerprint: string) => `shopper:${fingerprint}:memory`,
} as const;

export type RedisBackend = 'redis' | 'memory';

export interface RedisStatus {
  /** Both Upstash env vars are present. */
  configured: boolean;
  /** A command has succeeded (or none has failed yet) against real Redis. */
  available: boolean;
  backend: RedisBackend;
  /** True only when commands are genuinely reaching Redis. */
  distributedLocking: boolean;
  lastError: string | null;
  lastErrorAt: string | null;
}

interface MemoryEntry {
  value: string;
  expiresAt: number | null;
}

const memory = new Map<string, MemoryEntry>();

let reachable = true;
let lastError: string | null = null;
let lastErrorAt: string | null = null;
let warnedUnconfigured = false;
let warnedDegraded = false;

function credentials(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return { url, token };
}

export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL?.trim()) || credentials() !== null;
}

export function redisStatus(): RedisStatus {
  const configured = isRedisConfigured();
  const available = configured && reachable;

  return {
    configured,
    available,
    backend: available ? 'redis' : 'memory',
    distributedLocking: available,
    lastError,
    lastErrorAt,
  };
}

/**
 * Say plainly, once, that shared state is not actually shared. Silence here is how a
 * single-worker dev box turns into a multi-worker deployment that quietly loses locks.
 */
function warnDegraded(reason: string) {
  if (!isRedisConfigured()) {
    if (warnedUnconfigured) return;
    warnedUnconfigured = true;
    console.warn(
      '[redis] REDIS_URL or Upstash REST credentials are not set. ' +
        'Falling back to process-local memory: session state and locks are NOT shared ' +
        'between workers, and distributed locking is NOT active.'
    );
    return;
  }

  if (warnedDegraded) return;
  warnedDegraded = true;
  console.warn(
    `[redis] Redis is configured but unreachable (${reason}). Falling back to ` +
      'process-local memory: session state and locks are NOT shared between workers.'
  );
}

function noteFailure(err: unknown) {
  reachable = false;
  lastError = err instanceof Error ? err.message : String(err);
  lastErrorAt = new Date().toISOString();
  warnDegraded(lastError);
}

/** Raw command execution. Returns `undefined` when Redis could not be used at all. */
async function command<T>(args: unknown[]): Promise<{ ok: true; result: T } | { ok: false }> {
  if (process.env.REDIS_URL?.trim()) {
    try {
      const result = await redisTcpCommand(process.env.REDIS_URL.trim(), args) as T;
      reachable = true;
      warnedDegraded = false;
      return { ok: true, result };
    } catch (error) {
      noteFailure(error);
      return { ok: false };
    }
  }
  const creds = credentials();
  if (!creds) {
    warnDegraded('not configured');
    return { ok: false };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);

  try {
    const res = await fetch(creds.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!res.ok) {
      noteFailure(new Error(`HTTP ${res.status}`));
      return { ok: false };
    }

    const data = await res.json();
    // A successful round trip clears a previous outage.
    reachable = true;
    warnedDegraded = false;
    return { ok: true, result: data.result as T };
  } catch (err) {
    noteFailure(err);
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}

function memoryGet(key: string): string | null {
  const entry = memory.get(key);
  if (!entry) return null;
  if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
    memory.delete(key);
    return null;
  }
  return entry.value;
}

function memorySet(key: string, value: string, ttlSeconds?: number) {
  memory.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
  });
}

export async function get<T>(key: string): Promise<T | null> {
  const res = await command<string | null>(['GET', key]);
  const raw = res.ok ? res.result : memoryGet(key);
  if (typeof raw !== 'string') return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const serialized = JSON.stringify(value);
  const args = ttlSeconds
    ? ['SET', key, serialized, 'EX', ttlSeconds]
    : ['SET', key, serialized];

  const res = await command<string>(args);
  if (!res.ok) memorySet(key, serialized, ttlSeconds);
}

export async function del(key: string): Promise<void> {
  const res = await command<number>(['DEL', key]);
  if (!res.ok) memory.delete(key);
}

/** Read-through cache. `hit` distinguishes a cached value from a freshly loaded one. */
export async function remember<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>
): Promise<{ value: T; hit: boolean }> {
  const cached = await get<T>(key);
  if (cached !== null) return { value: cached, hit: true };

  const value = await loader();
  await set(key, value, ttlSeconds);
  return { value, hit: false };
}

/**
 * Append to a capped list stored as a single JSON value.
 *
 * A JSON array rather than a Redis LIST because every read wants the whole window
 * anyway, and one GET/SET pair keeps the memory fallback behaviourally identical.
 */
export async function appendCapped<T>(
  key: string,
  item: T,
  max: number,
  ttlSeconds: number
): Promise<T[]> {
  const current = (await get<T[]>(key)) ?? [];
  const next = [...current, item].slice(-max);
  await set(key, next, ttlSeconds);
  return next;
}

export interface LockHandle {
  key: string;
  token: string;
  /** False when the lock came from the memory fallback and guards only this process. */
  distributed: boolean;
}

/**
 * Atomic compare-and-delete. Without this, a lock whose TTL expired mid-request would
 * be deleted by its previous owner just after a new owner acquired it.
 */
const RELEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end`;

const RENEW_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("EXPIRE", KEYS[1], ARGV[2])
else
  return 0
end`;

/**
 * Acquire an owned lock. Returns null when someone else holds it.
 *
 * The token is what makes release safe: only the holder can drop it, so a slow request
 * whose lock already expired cannot delete the next request's lock.
 */
export async function acquireLock(
  key: string,
  ttlSeconds: number = TTL.LOCK
): Promise<LockHandle | null> {
  const token = crypto.randomUUID();

  const res = await command<string | null>(['SET', key, token, 'EX', ttlSeconds, 'NX']);
  if (res.ok) {
    return res.result === 'OK' ? { key, token, distributed: true } : null;
  }

  // Fallback: single-process mutual exclusion only, and it says so.
  if (memoryGet(key) !== null) return null;
  memorySet(key, token, ttlSeconds);
  return { key, token, distributed: false };
/* progress step 4 */
  if (memoryGet(key) !== null) return null;
  memorySet(key, token, ttlSeconds);
  return { key, token, distributed: false };
}

export async function releaseLock(handle: LockHandle | null): Promise<void> {
  if (!handle) return;

  const res = await command<number>([
    'EVAL',
    RELEASE_SCRIPT,
    1,
    handle.key,
    handle.token,
  ]);
  if (res.ok) return;

  if (memoryGet(handle.key) === handle.token) memory.delete(handle.key);
}

/** Extend a lock still held by this owner. Returns false if ownership was lost. */
export async function renewLock(
  handle: LockHandle | null,
  ttlSeconds: number = TTL.LOCK
): Promise<boolean> {
  if (!handle) return false;

  const res = await command<number>([
    'EVAL',
    RENEW_SCRIPT,
    1,
    handle.key,
    handle.token,
    ttlSeconds,
  ]);
  if (res.ok) return res.result === 1;

  if (memoryGet(handle.key) !== handle.token) return false;
  memorySet(handle.key, handle.token, ttlSeconds);
  return true;
}

/**
 * Claim a one-time marker. Returns true the first time and false for every repeat
 * within the TTL — used to collapse duplicate final-transcript events.
 */
export async function claimOnce(key: string, ttlSeconds: number = TTL.DEDUPE): Promise<boolean> {
  const res = await command<string | null>(['SET', key, '1', 'EX', ttlSeconds, 'NX']);
  if (res.ok) return res.result === 'OK';

  if (memoryGet(key) !== null) return false;
  memorySet(key, '1', ttlSeconds);
  return true;
}

/** Test seam: drop process-local state between cases. Does not touch real Redis. */
export function __resetMemoryForTests() {
  memory.clear();
  reachable = true;
  lastError = null;
  lastErrorAt = null;
  warnedUnconfigured = false;
  warnedDegraded = false;
}

/** Compatibility helper for code that still expects raw string values. */
export async function redisGet(key: string): Promise<string | null> {
  const res = await command<string | null>(['GET', key]);
  return res.ok ? res.result : memoryGet(key);
}

/** Compatibility helper for legacy SETEX call sites. */
export async function redisSetEx(key: string, seconds: number, value: string): Promise<void> {
  const res = await command<string>(['SET', key, value, 'EX', seconds]);
  if (!res.ok) memorySet(key, value, seconds);
}