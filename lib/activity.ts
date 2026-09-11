import { LogKind, LogStatus, Prisma } from '@prisma/client';
import { prisma } from './db';
import type { LogKindFilter } from './logKinds';

export { LOG_KIND_FILTERS, type LogKindFilter } from './logKinds';

export interface LogEntry {
  event: string;
  kind: LogKind;
  status?: LogStatus;
  sessionId?: string | null;
  model?: string | null;
  latencyMs?: number | null;
  tokensIn?: number | null;
  tokensOut?: number | null;
  cost?: number | null;
  detail?: string | null;
}

/**
 * Record something that actually happened.
 *
 * Logging must never break the request that triggered it, so failures are swallowed
 * after being reported to the server console.
 */
export async function recordActivity(entry: LogEntry): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        event: entry.event,
        kind: entry.kind,
        status: entry.status ?? LogStatus.OK,
        sessionId: entry.sessionId ?? null,
        model: entry.model ?? null,
        latencyMs: entry.latencyMs ?? null,
        tokensIn: entry.tokensIn ?? null,
        tokensOut: entry.tokensOut ?? null,
        cost: entry.cost === null || entry.cost === undefined ? null : new Prisma.Decimal(entry.cost),
        detail: entry.detail ?? null,
      },
    });
  } catch (err) {
    console.error('[activity] failed to record', entry.event, err);
  }
}

/** Fire-and-forget variant for paths that must not wait on the write. */
export function recordActivityAsync(entry: LogEntry): void {
  void recordActivity(entry);
}


export interface ActivityQuery {
  kind: LogKindFilter;
  q: string;
  limit: number;
}

export async function listActivity(query: ActivityQuery) {
  const where: Prisma.ActivityLogWhereInput = {};

  if (query.kind !== 'all') {
    where.kind = query.kind.toUpperCase() as LogKind;
  }

  if (query.q) {
    const contains = { contains: query.q, mode: Prisma.QueryMode.insensitive };
    where.OR = [{ event: contains }, { sessionId: contains }, { model: contains }, { detail: contains }];
  }

  return prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: query.limit,
  });
}

export type ActivityRecord = Awaited<ReturnType<typeof listActivity>>[number];

/**
 * Latency percentiles per event kind, computed from recorded measurements.
 * Returns nothing for a kind that has not been measured yet rather than inventing a number.
 */
export async function latencyByKind(since: Date) {
  const rows = await prisma.activityLog.findMany({
    where: { createdAt: { gte: since }, latencyMs: { not: null } },
    select: { kind: true, latencyMs: true },
  });

  const buckets = new Map<LogKind, number[]>();
  for (const row of rows) {
    if (row.latencyMs === null) continue;
    const list = buckets.get(row.kind) ?? [];
    list.push(row.latencyMs);
    buckets.set(row.kind, list);
  }

  return [...buckets.entries()].map(([kind, values]) => {
    values.sort((a, b) => a - b);
    const at = (p: number) => values[Math.min(values.length - 1, Math.floor(values.length * p))];
    return { kind, count: values.length, p50: at(0.5), p95: at(0.95), max: values[values.length - 1] };
  });
}
