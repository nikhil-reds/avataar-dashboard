'use client';

import React, { useCallback, useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { STATUS_FILTERS, type StatusFilter } from '@/lib/conversationQuery';

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'All sessions',
  live: 'Live',
  ended: 'Ended',
};

interface ConversationFiltersProps {
  q: string;
  status: StatusFilter;
  from: string;
  to: string;
  minTurns: number;
}

/**
 * Filter state is written to the URL rather than component state, so the filtering runs
 * in Postgres, and a filtered view can be shared or reloaded without losing its shape.
 */
export const ConversationFilters: React.FC<ConversationFiltersProps> = ({
  q,
  status,
  from,
  to,
  minTurns,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [term, setTerm] = useState(q);
  const [lastPushedQ, setLastPushedQ] = useState(q);

  // Re-sync the input when the URL changes from elsewhere (back button, "Clear
  // filters"). Adjusting state during render rather than in an effect avoids the
  // cascading re-render an effect would cause.
  if (q !== lastPushedQ) {
    setLastPushedQ(q);
    setTerm(q);
  }

  const push = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      // A changed filter invalidates the page number, and the selected row may no
      // longer be in the result set.
      params.delete('page');
      params.delete('selected');

      const qs = params.toString();
      startTransition(() => router.replace(pathname + (qs ? '?' + qs : ''), { scroll: false }));
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    if (term === q) return;
    const timer = setTimeout(() => {
      push((params) => {
        if (term) params.set('q', term);
        else params.delete('q');
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [term, q, push]);

  const setParam = (key: string, value: string) =>
    push((params) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });

  const inputClass =
    'text-xs px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-full border border-zinc-200/80 dark:border-zinc-700">
          {STATUS_FILTERS.map((item) => {
            const isActive = status === item;
            return (
              <button
                key={item}
                onClick={() => setParam('status', item === 'all' ? '' : item)}
                className={`text-[12.5px] font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  isActive
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {STATUS_LABELS[item]}
              </button>
            );
          })}
        </div>

        <div className="relative flex-1 min-w-[240px]">
          {isPending ? (
            <Loader2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 animate-spin" />
          ) : (
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          )}
          <input
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search questions, answers, session id…"
            className={inputClass + ' w-full pl-9'}
          />
        </div>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <label className="flex items-center gap-2 text-[11.5px] text-zinc-500">
          <span className="font-mono uppercase tracking-wider text-[10px] text-zinc-400">from</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setParam('from', e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex items-center gap-2 text-[11.5px] text-zinc-500">
          <span className="font-mono uppercase tracking-wider text-[10px] text-zinc-400">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setParam('to', e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="flex items-center gap-2 text-[11.5px] text-zinc-500">
          <span className="font-mono uppercase tracking-wider text-[10px] text-zinc-400">
            min turns
          </span>
          <input
            type="number"
            min={0}
            value={minTurns || ''}
            onChange={(e) => setParam('minTurns', e.target.value)}
            placeholder="0"
            className={inputClass + ' w-20'}
          />
        </label>

        {(q || status !== 'all' || from || to || minTurns > 0) && (
          <button
            onClick={() => startTransition(() => router.replace(pathname, { scroll: false }))}
            className="text-[11.5px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
};
