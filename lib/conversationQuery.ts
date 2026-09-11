// Pure query-state helpers. Deliberately free of any Prisma import so client
// components can share this logic without pulling the database client into the bundle.

export const SORT_FIELDS = ['startedAt', 'turnCount', 'durationSec'] as const;
export type SortField = (typeof SORT_FIELDS)[number];

export const SORT_DIRECTIONS = ['asc', 'desc'] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

export const STATUS_FILTERS = ['all', 'live', 'ended'] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export const SORT_LABELS: Record<SortField, string> = {
  startedAt: 'Started',
  turnCount: 'Turns',
  durationSec: 'Duration',
};

export const DEFAULT_PER_PAGE = 25;

export interface ConversationQuery {
  q: string;
  status: StatusFilter;
  from: Date | null;
  to: Date | null;
  minTurns: number;
  sort: SortField;
  dir: SortDirection;
  page: number;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Filter + sort state lives in the URL, so a filtered view is shareable and survives reload. */
export function parseConversationQuery(params: RawSearchParams): ConversationQuery {
  const sortRaw = first(params.sort) as SortField;
  const dirRaw = first(params.dir) as SortDirection;
  const statusRaw = first(params.status) as StatusFilter;

  const from = parseDate(first(params.from));
  const to = parseDate(first(params.to));
  // A date input yields midnight; push the upper bound to the end of that day so
  // "to: today" includes conversations that happened today.
  if (to) to.setHours(23, 59, 59, 999);

  const minTurns = Number.parseInt(first(params.minTurns), 10);
  const page = Number.parseInt(first(params.page), 10);

  return {
    q: first(params.q).slice(0, 200),
    status: STATUS_FILTERS.includes(statusRaw) ? statusRaw : 'all',
    from,
    to,
    minTurns: Number.isFinite(minTurns) && minTurns > 0 ? minTurns : 0,
    sort: SORT_FIELDS.includes(sortRaw) ? sortRaw : 'startedAt',
    dir: SORT_DIRECTIONS.includes(dirRaw) ? dirRaw : 'desc',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export interface SearchOverrides extends Partial<ConversationQuery> {
  selected?: string | null;
}

/** Serialise query state back to a URL search string, with selective overrides. */
export function buildSearchString(
  query: ConversationQuery,
  overrides: SearchOverrides = {},
  selected?: string | null
): string {
  const merged = { ...query, ...overrides };
  const params = new URLSearchParams();

  if (merged.q) params.set('q', merged.q);
  if (merged.status !== 'all') params.set('status', merged.status);
  if (merged.from) params.set('from', merged.from.toISOString().slice(0, 10));
  if (merged.to) params.set('to', merged.to.toISOString().slice(0, 10));
  if (merged.minTurns > 0) params.set('minTurns', String(merged.minTurns));
  if (merged.sort !== 'startedAt') params.set('sort', merged.sort);
  if (merged.dir !== 'desc') params.set('dir', merged.dir);
  if (merged.page > 1) params.set('page', String(merged.page));

  const keepSelected = overrides.selected !== undefined ? overrides.selected : selected;
  if (keepSelected) params.set('selected', keepSelected);

  const qs = params.toString();
  return qs ? '?' + qs : '';
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds < 0) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
}

/** Derive a session title from the shopper's first question. */
export function deriveTitle(text: string): string {
  const cleaned = text.trim().replace(/\s+/g, ' ');
  return cleaned.length > 80 ? cleaned.slice(0, 79) + '…' : cleaned;
}

// Fixed timezone so server-rendered timestamps are deterministic and match the IST
// clock the rest of the console displays.
const STAMP_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Kolkata',
});

export function formatStamp(date: Date | null): string {
  return date ? STAMP_FORMAT.format(date) : '—';
}

/**
 * A session only leaves LIVE when the browser reports it closed. A tab killed mid-call
 * never sends that, so treat a long-silent LIVE row as stale rather than pretending it
 * is still running.
 */
export const STALE_AFTER_MS = 15 * 60 * 1000;

export function isStale(status: string, lastTurnAt: Date | null, startedAt: Date): boolean {
  if (status !== 'LIVE') return false;
  return Date.now() - (lastTurnAt ?? startedAt).getTime() > STALE_AFTER_MS;
}
