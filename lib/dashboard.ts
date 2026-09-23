import { LogKind, LogStatus, SkuState, SpeakerRole } from '@/app/generated/prisma';
import { prisma } from './db';
import { latencyByKind } from './activity';
import { liveAvatarConfig } from './liveavatarConfig';
import { redisStatus } from './redis';
import type { LatencyItem, ServiceHealthItem, StatItem } from '../types';

const GREEN = '#10b981';
const AMBER = '#f59e0b';
const RED = '#ef4444';
const GREY = '#6b7280';

const MUTED = 'text-zinc-500 dark:text-zinc-400';
const UP = 'text-emerald-600 dark:text-emerald-400';
const DOWN = 'text-rose-600 dark:text-rose-400';
const WARN = 'text-amber-600 dark:text-amber-400';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function describeChange(today: number, yesterday: number): { text: string; color: string } {
  if (yesterday === 0) {
    return today === 0
      ? { text: 'no activity yesterday either', color: MUTED }
      : { text: 'first activity recorded', color: UP };
  }
  const pct = Math.round(((today - yesterday) / yesterday) * 100);
  if (pct === 0) return { text: 'level with yesterday', color: MUTED };
  return {
    text: `${pct > 0 ? '+' : ''}${pct}% vs yesterday`,
    color: pct > 0 ? UP : DOWN,
  };
}

/**
 * Headline numbers, every one of them counted from stored rows. Where nothing has been
 * recorded yet the card says so rather than showing a plausible-looking figure.
 */
export async function getStats(): Promise<StatItem[]> {
  try {
    const today = startOfToday();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const [
      sessionsToday,
      sessionsYesterday,
      questionsToday,
      chatLatencies,
      skuTotal,
      skuInReview,
    ] = await Promise.all([
      prisma.shopperSession.count({ where: { startedAt: { gte: today } } }),
      prisma.shopperSession.count({ where: { startedAt: { gte: yesterday, lt: today } } }),
      prisma.sessionTurn.count({ where: { who: SpeakerRole.SHOPPER, createdAt: { gte: today } } }),
      prisma.activityLog.aggregate({
        where: { kind: LogKind.CHAT, createdAt: { gte: today }, latencyMs: { not: null } },
        _avg: { latencyMs: true },
        _count: true,
/* progress step 1 */
      prisma.productSku.count({ where: { state: SkuState.REVIEW } }),
    ]);

    const sessionChange = describeChange(sessionsToday, sessionsYesterday);
    const avgLatency = chatLatencies._avg.latencyMs;

    return [
      {
        label: 'sessions today',
        value: String(sessionsToday),
        delta: sessionChange.text,
        deltaColor: sessionChange.color,
      },
      {
        label: 'questions asked today',
        value: String(questionsToday),
        delta:
          sessionsToday > 0
            ? `${(questionsToday / sessionsToday).toFixed(1)} per session`
            : 'no sessions yet today',
        deltaColor: MUTED,
      },
      {
        label: 'avg answer time',
        value: avgLatency === null ? '—' : `${(avgLatency / 1000).toFixed(1)}s`,
        delta:
          avgLatency === null
            ? 'no answers measured yet'
            : `across ${chatLatencies._count} answers today`,
        deltaColor: MUTED,
      },
      {
        label: 'catalogue SKUs',
        value: String(skuTotal),
        delta: skuInReview > 0 ? `${skuInReview} awaiting review` : 'none awaiting review',
        deltaColor: skuInReview > 0 ? WARN : MUTED,
      },
    ];
  } catch (err) {
    console.warn('[getStats] Database unreachable:', err);
    return [
      { label: 'sessions today', value: '0', delta: 'db unreachable', deltaColor: MUTED },
      { label: 'questions asked today', value: '0', delta: 'db unreachable', deltaColor: MUTED },
      { label: 'avg answer time', value: '—', delta: 'db unreachable', deltaColor: MUTED },
      { label: 'catalogue SKUs', value: '0', delta: 'db unreachable', deltaColor: MUTED },
    ];
  }
}

/**
 * Real reachability and configuration checks. Nothing here is asserted without being
 * measured: the database row is an actual timed round trip, and the two provider rows
 * report whether a key is present plus how their recent calls went.
 */
export async function getServiceHealth(): Promise<ServiceHealthItem[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const dbStart = Date.now();
  let dbOk = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbOk = false;
  }
  const dbMs = Date.now() - dbStart;

  let answerCalls = 0, answerErrors = 0, avatarSessions = 0, avatarErrors = 0, storedTurns = 0;
  if (dbOk) {
    try {
      [answerCalls, answerErrors, avatarSessions, avatarErrors, storedTurns] = await Promise.all([
        prisma.activityLog.count({ where: { kind: LogKind.CHAT, createdAt: { gte: since } } }),
        prisma.activityLog.count({
          where: { kind: LogKind.CHAT, status: LogStatus.ERROR, createdAt: { gte: since } },
        }),
        prisma.shopperSession.count({ where: { startedAt: { gte: since } } }),
        prisma.activityLog.count({
          where: { kind: LogKind.SESSION, status: LogStatus.ERROR, createdAt: { gte: since } },
        }),
        prisma.sessionTurn.count(),
      ]);
    } catch {}
  }

  const avatarConfigured = Boolean(liveAvatarConfig().apiKey);
  const redis = redisStatus();

  // The model runs locally, so "configured" is not a key check but a reachability check:
  // the container is either answering or it is not.
  let llmOk = false;
  const llmStart = Date.now();
  try {
    const res = await fetch(`${llmBaseUrl()}/api/tags`, { signal: AbortSignal.timeout(2_000) });
    llmOk = res.ok;
  } catch {
    llmOk = false;
  }
  const llmMs = Date.now() - llmStart;

  return [
    {
      name: 'Database',
      note: dbOk ? 'postgres · conversation + catalogue store' : 'unreachable',
      metric: dbOk ? `${dbMs}ms` : 'down',
      color: dbOk ? (dbMs < 100 ? GREEN : AMBER) : RED,
    },
    {
      name: 'LiveAvatar (HeyGen)',
      note: avatarConfigured
        ? `${avatarSessions} sessions in 24h`
        : 'LIVEAVATAR_API_KEY not configured',
      metric: avatarErrors > 0 ? `${avatarErrors} errors` : avatarConfigured ? 'ready' : 'no key',
      color: !avatarConfigured ? GREY : avatarErrors > 0 ? RED : GREEN,
    },
    {
      name: `Local LLM (${llmModel()})`,
      note: llmOk
        ? `${answerCalls} answers in 24h · ${llmMs}ms to respond`
        : `ollama unreachable at ${llmBaseUrl()} — run: docker compose up -d ollama`,
      metric: answerErrors > 0 ? `${answerErrors} errors` : llmOk ? 'ready' : 'down',
      color: !llmOk ? RED : answerErrors > 0 ? AMBER : GREEN,
    },
    {
      // Shared runtime state. Reported honestly: the in-memory fallback is not Redis
      // and is never coloured as healthy, because two workers do not share it.
      name: 'Redis',
      note: redis.available
        ? 'shared session state · distributed locking active'
        : redis.configured
          ? 'configured but unreachable · in-memory fallback, locks are process-local'
          : 'not configured · in-memory fallback, locks are process-local',
      metric: redis.available ? 'redis' : 'memory',
      color: redis.available ? GREEN : redis.configured ? RED : AMBER,
    },
    {
      // HeyGen owns the conversation LLM. These counters cover turn orchestration and
      // any optional Gemini-backed feature, neither of which gates the avatar.
      name: 'Turn orchestration',
      note: `${answerCalls} turn events in 24h · HeyGen owns LLM + voice`,
      metric: answerErrors > 0 ? `${answerErrors} errors` : 'ready',
      color: answerErrors > 0 ? RED : GREEN,
    },
    {
      name: 'Transcript store',
      note: 'turns persisted across all sessions',
      metric: String(storedTurns),
      color: storedTurns > 0 ? GREEN : GREY,
    },
  ];
}

const KIND_LABELS: Record<LogKind, string> = {
  CHAT: 'Answer latency',
  SESSION: 'Session setup',
  RENDER: 'Video render',
  INGEST: 'PDF extraction',
};

/** Percentiles from recorded measurements. Unmeasured routes are simply absent. */
export async function getLatencyRoutes(): Promise<LatencyItem[]> {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const buckets = await latencyByKind(since);

    if (buckets.length === 0) return [];

    const ceiling = Math.max(...buckets.map((b) => b.p95), 1);

    return buckets
      .sort((a, b) => b.count - a.count)
      .map((bucket) => ({
        name: `${KIND_LABELS[bucket.kind]} · ${bucket.count} samples`,
        readout: `${bucket.p50} / ${bucket.p95} ms`,
        pct: `${Math.round((bucket.p95 / ceiling) * 100)}%`,
        color: bucket.p95 > 3000 ? RED : bucket.p95 > 1500 ? AMBER : GREEN,
      }));
  } catch (err) {
    console.warn('[getLatencyRoutes] Database unreachable:', err);
    return [];
  }
}

/** Real counts for the sidebar badges. */
export async function getNavBadges() {
  const [conversations, skusInReview, ingestJobs] = await Promise.all([
    prisma.shopperSession.count(),
    prisma.productSku.count({ where: { state: SkuState.REVIEW } }),
    prisma.ingestJob.count({ where: { state: { in: ['QUEUED', 'EXTRACTING'] } } }),
  ]);

  return { conversations, skusInReview, ingestJobs };
}