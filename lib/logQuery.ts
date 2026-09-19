// Pure query-state helpers for the activity log. Free of any Prisma import so the
// filter, sort and pagination controls can share this logic without pulling the
// database client into the browser bundle.

import { LOG_KIND_FILTERS, type LogKindFilter } from './logKinds';

export { LOG_KIND_FILTERS, type LogKindFilter } from './logKinds';

export const LOG_STATUS_FILTERS = ['all', 'ok', 'error', 'escalated'] as const;
export type LogStatusFilter = (typeof LOG_STATUS_FILTERS)[number];

export const LOG_SORT_FIELDS = ['createdAt', 'event', 'model', 'latencyMs'] as const;
export type LogSortField = (typeof LOG_SORT_FIELDS)[number];

export const LOG_SORT_DIRECTIONS = ['asc', 'desc'] as const;
export type LogSortDirection = (typeof LOG_SORT_DIRECTIONS)[number];

export const LOG_SORT_LABELS: Record<LogSortField, string> = {
  createdAt: 'Time',
  event: 'Event',
  model: 'Source',
  latencyMs: 'Latency',
};

export const LOG_KIND_LABELS: Record<LogKindFilter, string> = {
  all: 'All events',
  chat: 'Conversations',
  session: 'Sessions',
  render: 'Renders',
  ingest: 'Ingest',
};

export const LOG_STATUS_LABELS: Record<LogStatusFilter, string> = {
  all: 'Any status',
  ok: 'OK',
  error: 'Errors',
  escalated: 'Escalated',
};

export const LOG_PER_PAGE_OPTIONS = [25, 50, 100] as const;
export const DEFAULT_LOG_PER_PAGE = 25;

/** Latency above which an event is worth looking at, used by the "Slow" quick filter. */
export const SLOW_REQUEST_MS = 2000;

export interface LogQuery {
  q: string;
  kind: LogKindFilter;
  status: LogStatusFilter;
  from: Date | null;
  to: Date | null;
  /** Milliseconds; 0 means unfiltered. */
  minLatency: number;
  sort: LogSortField;
  dir: LogSortDirection;
  page: number;
  perPage: number;
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

/** Filter, sort and page state lives in the URL, so a view is shareable and survives reload. */
export function parseLogQuery(params: RawSearchParams): LogQuery {
  const kindRaw = first(params.kind) as LogKindFilter;
  const statusRaw = first(params.status) as LogStatusFilter;
  const sortRaw = first(params.sort) as LogSortField;
  const dirRaw = first(params.dir) as LogSortDirection;

  const from = parseDate(first(params.from));
  const to = parseDate(first(params.to));
  // A date input yields midnight; push the upper bound to the end of that day so
  // "to: today" includes events recorded today.
  if (to) to.setHours(23, 59, 59, 999);

  const minLatency = Number.parseInt(first(params.minLatency), 10);
  const page = Number.parseInt(first(params.page), 10);
  const perPage = Number.parseInt(first(params.perPage), 10);

  return {
    q: first(params.q).slice(0, 200),
    kind: LOG_KIND_FILTERS.includes(kindRaw) ? kindRaw : 'all',
    status: LOG_STATUS_FILTERS.includes(statusRaw) ? statusRaw : 'all',
    from,
    to,
    minLatency: Number.isFinite(minLatency) && minLatency > 0 ? minLatency : 0,
    sort: LOG_SORT_FIELDS.includes(sortRaw) ? sortRaw : 'createdAt',
    dir: LOG_SORT_DIRECTIONS.includes(dirRaw) ? dirRaw : 'desc',
    page: Number.isFinite(page) && page > 0 ? page : 1,
    perPage: (LOG_PER_PAGE_OPTIONS as readonly number[]).includes(perPage)
      ? perPage
      : DEFAULT_LOG_PER_PAGE,
  };
}

export interface LogSearchOverrides extends Partial<LogQuery> {
  selected?: string | null;
}

/** Serialise query state back to a URL search string, with selective overrides. */
export function buildLogSearch(
  query: LogQuery,
  overrides: LogSearchOverrides = {},
  selected?: string | null
): string {
  const merged = { ...query, ...overrides };
  const params = new URLSearchParams();

  // Defaults are left out, so an untouched view has a clean URL.
  if (merged.q) params.set('q', merged.q);
  if (merged.kind !== 'all') params.set('kind', merged.kind);
  if (merged.status !== 'all') params.set('status', merged.status);
  if (merged.from) params.set('from', toDateInput(merged.from));
  if (merged.to) params.set('to', toDateInput(merged.to));
  if (merged.minLatency > 0) params.set('minLatency', String(merged.minLatency));
  if (merged.sort !== 'createdAt') params.set('sort', merged.sort);
  if (merged.dir !== 'desc') params.set('dir', merged.dir);
  if (merged.page > 1) params.set('page', String(merged.page));
  if (merged.perPage !== DEFAULT_LOG_PER_PAGE) params.set('perPage', String(merged.perPage));

  const keepSelected = overrides.selected !== undefined ? overrides.selected : selected;
  if (keepSelected) params.set('selected', keepSelected);

  const qs = params.toString();
  return qs ? '?' + qs : '';
}

/** `yyyy-mm-dd` in local time, which is what a date input reads and writes. */
export function toDateInput(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function isFiltered(query: LogQuery): boolean {
  return Boolean(
    query.q ||
      query.kind !== 'all' ||
      query.status !== 'all' ||
      query.from ||
      query.to ||
      query.minLatency > 0
  );
}

export const QUICK_FILTER_IDS = ['errors', 'escalated', 'slow', 'today', 'week'] as const;
export type QuickFilterId = (typeof QUICK_FILTER_IDS)[number];

export const QUICK_FILTER_LABELS: Record<QuickFilterId, string> = {
  errors: 'Errors only',
  escalated: 'Escalated',
  slow: `Slow · >${SLOW_REQUEST_MS / 1000}s`,
  today: 'Today',
  week: 'Last 7 days',
};

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/**
 * The query change a quick filter applies. `now` is passed in rather than read from
 * the clock so the patch stays a pure function of its input — and so the date a chip
 * writes matches the date it is compared against when deciding whether it is active.
 */
export function quickFilterPatch(id: QuickFilterId, now: Date): Partial<LogQuery> {
  switch (id) {
    case 'errors':
      return { status: 'error' };
    case 'escalated':
      return { status: 'escalated' };
    case 'slow':
      return { minLatency: SLOW_REQUEST_MS };
    case 'today':
      return { from: startOfDay(now), to: startOfDay(now) };
    case 'week': {
      const from = startOfDay(now);
      from.setDate(from.getDate() - 6);
      return { from, to: startOfDay(now) };
    }
  }
}

/** The change that turns a quick filter back off, so a chip toggles. */
export function quickFilterReset(id: QuickFilterId): Partial<LogQuery> {
  switch (id) {
    case 'errors':
    case 'escalated':
      return { status: 'all' };
    case 'slow':
      return { minLatency: 0 };
    case 'today':
    case 'week':
      return { from: null, to: null };
  }
}

export function isQuickFilterActive(
  id: QuickFilterId,
  query: LogQuery,
  now: Date
): boolean {
  const patch = quickFilterPatch(id, now);

  if (id === 'errors' || id === 'escalated') return query.status === patch.status;
  if (id === 'slow') return query.minLatency === patch.minLatency;

  // Date chips match on the day, not the instant: `to` has been pushed to end of day.
  if (!query.from || !query.to || !patch.from || !patch.to) return false;
  return (
    toDateInput(query.from) === toDateInput(patch.from) &&
    toDateInput(query.to) === toDateInput(patch.to)
  );
}
