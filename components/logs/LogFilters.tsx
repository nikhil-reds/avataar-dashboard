'use client';

import React, { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, Loader2, X, SlidersHorizontal } from 'lucide-react';
import {
  isQuickFilterActive,
  LOG_KIND_FILTERS,
  LOG_KIND_LABELS,
  LOG_SORT_FIELDS,
  LOG_SORT_LABELS,
  LOG_STATUS_FILTERS,
  LOG_STATUS_LABELS,
  QUICK_FILTER_IDS,
  QUICK_FILTER_LABELS,
  quickFilterPatch,
  quickFilterReset,
  toDateInput,
  type LogQuery,
  type LogSortField,
  type LogStatusFilter,
} from '../../lib/logQuery';

interface LogFiltersProps {
  query: LogQuery;
  matching: number;
  total: number;
  filtered: boolean;
}

const CHIP =
  'shrink-0 text-[12.5px] font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer';
const FIELD =
  'text-xs px-2.5 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all';

/**
 * Filter, quick-filter and sort controls. Every control writes to the URL rather than
 * to component state, so filtering and sorting run in Postgres and the resulting view
 * can be shared or reloaded without losing its shape.
 */
export const LogFilters: React.FC<LogFiltersProps> = ({
  query,
  matching,
  total,
  filtered,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [term, setTerm] = useState(query.q);
  const [lastQuery, setLastQuery] = useState(query.q);
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(query.from || query.to || query.minLatency),
  );

  // Re-sync when the URL changes from elsewhere (back button, "Clear filters"), without
  // an effect that would cascade a second render.
  if (query.q !== lastQuery) {
    setLastQuery(query.q);
    setTerm(query.q);
  }

  // One instant for the whole render: a chip must write the same day boundary it is
  // later compared against, or "Today" would never look active.
  const now = useMemo(() => new Date(), []);

  const push = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(params.toString());
      mutate(next);
      // A changed filter invalidates the page number, and the row that was open may
      // not survive the new result set.
      next.delete('page');
      next.delete('selected');
      const qs = next.toString();
      startTransition(() => router.replace(pathname + (qs ? '?' + qs : ''), { scroll: false }));
    },
    [params, pathname, router]
  );

  useEffect(() => {
    if (term === query.q) return;
    const timer = setTimeout(() => {
      push((next) => {
        if (term) next.set('q', term);
        else next.delete('q');
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [term, query.q, push]);

  /** Writes a LogQuery patch onto the URL, dropping params that are back at default. */
  const applyPatch = (patch: Partial<LogQuery>) => {
    push((next) => {
      if ('status' in patch) {
        if (patch.status && patch.status !== 'all') next.set('status', patch.status);
        else next.delete('status');
      }
      if ('minLatency' in patch) {
        if (patch.minLatency) next.set('minLatency', String(patch.minLatency));
        else next.delete('minLatency');
      }
      if ('from' in patch) {
        if (patch.from) next.set('from', toDateInput(patch.from));
        else next.delete('from');
      }
      if ('to' in patch) {
        if (patch.to) next.set('to', toDateInput(patch.to));
        else next.delete('to');
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-full border border-zinc-200/80 dark:border-zinc-700 max-w-full overflow-x-auto">
          {LOG_KIND_FILTERS.map((item) => {
            const isActive = query.kind === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() =>
                  push((next) => {
                    if (item === 'all') next.delete('kind');
                    else next.set('kind', item);
                  })
                }
                className={`${CHIP} ${
                  isActive
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {LOG_KIND_LABELS[item]}
              </button>
            );
          })}
        </div>

        <div className="relative flex-1 w-full sm:w-auto sm:min-w-[220px]">
          {isPending ? (
            <Loader2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 animate-spin" />
          ) : (
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          )}
          <input
            type="text"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search event, session id, source or detail…"
            className="w-full text-xs pl-9 pr-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          aria-expanded={showAdvanced}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
            showAdvanced
              ? 'border-indigo-300 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/30'
              : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filters</span>
        </button>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <span className="font-mono text-[9.5px] uppercase tracking-wider text-zinc-400 font-semibold">
          quick
        </span>

        {QUICK_FILTER_IDS.map((id) => {
          const isActive = isQuickFilterActive(id, query, now);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={isActive}
              onClick={() =>
                applyPatch(isActive ? quickFilterReset(id) : quickFilterPatch(id, now))
              }
              className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                isActive
                  ? 'border-indigo-500 bg-indigo-600 text-white'
                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-600'
              }`}
            >
              {QUICK_FILTER_LABELS[id]}
            </button>
          );
        })}

        <span className="font-mono text-[11px] text-zinc-400 ml-auto">
          {filtered ? `${matching} of ${total} events` : `${total} events`}
        </span>

        {filtered && (
          <button
            type="button"
            onClick={() =>
              startTransition(() => router.replace(pathname, { scroll: false }))
            }
            className="flex items-center gap-1 text-[11.5px] font-semibold text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
            Clear filters
          </button>
        )}
      </div>

      {showAdvanced && (
        <div className="flex gap-3 flex-wrap items-end border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-3">
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[9.5px] uppercase tracking-wider text-zinc-400 font-semibold">
              status
            </span>
            <select
              value={query.status}
              onChange={(event) =>
                applyPatch({ status: event.target.value as LogStatusFilter })
              }
              className={FIELD}
            >
              {LOG_STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {LOG_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-mono text-[9.5px] uppercase tracking-wider text-zinc-400 font-semibold">
              from
            </span>
            <input
              type="date"
              value={query.from ? toDateInput(query.from) : ''}
              onChange={(event) =>
                push((next) => {
                  if (event.target.value) next.set('from', event.target.value);
                  else next.delete('from');
                })
              }
              className={FIELD}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-mono text-[9.5px] uppercase tracking-wider text-zinc-400 font-semibold">
              to
            </span>
            <input
              type="date"
              value={query.to ? toDateInput(query.to) : ''}
              onChange={(event) =>
                push((next) => {
                  if (event.target.value) next.set('to', event.target.value);
                  else next.delete('to');
                })
              }
              className={FIELD}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-mono text-[9.5px] uppercase tracking-wider text-zinc-400 font-semibold">
              min latency (ms)
            </span>
            <input
              type="number"
              min={0}
              step={100}
              value={query.minLatency || ''}
              placeholder="0"
              onChange={(event) =>
                push((next) => {
                  const value = Number.parseInt(event.target.value, 10);
                  if (Number.isFinite(value) && value > 0) next.set('minLatency', String(value));
                  else next.delete('minLatency');
                })
              }
              className={`${FIELD} w-32`}
            />
          </label>

          {/* The table header carries the sort on `md` and up, where it is visible. */}
          <label className="flex flex-col gap-1 md:hidden">
            <span className="font-mono text-[9.5px] uppercase tracking-wider text-zinc-400 font-semibold">
              sort
            </span>
            <select
              value={`${query.sort}:${query.dir}`}
              onChange={(event) => {
                const [sort, dir] = event.target.value.split(':');
                push((next) => {
                  if (sort === 'createdAt') next.delete('sort');
                  else next.set('sort', sort);
                  if (dir === 'desc') next.delete('dir');
                  else next.set('dir', dir);
                });
              }}
              className={FIELD}
            >
              {LOG_SORT_FIELDS.map((field: LogSortField) => (
                <React.Fragment key={field}>
                  <option value={`${field}:desc`}>{LOG_SORT_LABELS[field]} ↓</option>
                  <option value={`${field}:asc`}>{LOG_SORT_LABELS[field]} ↑</option>
                </React.Fragment>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
};
