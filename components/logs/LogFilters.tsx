'use client';

import React, { useCallback, useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { LOG_KIND_FILTERS, type LogKindFilter } from '../../lib/logKinds';

const LABELS: Record<LogKindFilter, string> = {
  all: 'All events',
  chat: 'Conversations',
  session: 'Sessions',
  render: 'Renders',
  ingest: 'Ingest',
};

interface LogFiltersProps {
  kind: LogKindFilter;
  searchQuery: string;
}

export const LogFilters: React.FC<LogFiltersProps> = ({ kind, searchQuery }) => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [term, setTerm] = useState(searchQuery);
  const [lastQuery, setLastQuery] = useState(searchQuery);

  // Re-sync when the URL changes from elsewhere, without an effect that would cascade.
  if (searchQuery !== lastQuery) {
    setLastQuery(searchQuery);
    setTerm(searchQuery);
  }

  const push = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(params.toString());
      mutate(next);
      // The previously selected row may not survive the new filter.
      next.delete('selected');
      const qs = next.toString();
      startTransition(() => router.replace(pathname + (qs ? '?' + qs : ''), { scroll: false }));
    },
    [params, pathname, router]
  );

  useEffect(() => {
    if (term === searchQuery) return;
    const timer = setTimeout(() => {
      push((next) => {
        if (term) next.set('q', term);
        else next.delete('q');
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [term, searchQuery, push]);

  return (
    <div className="flex gap-3 flex-wrap items-center">
      <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-full border border-zinc-200/80 dark:border-zinc-700">
        {LOG_KIND_FILTERS.map((item) => {
          const isActive = kind === item;
          return (
            <button
              key={item}
              onClick={() =>
                push((next) => {
                  if (item === 'all') next.delete('kind');
                  else next.set('kind', item);
                })
              }
              className={`text-[12.5px] font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                isActive
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {LABELS[item]}
            </button>
          );
        })}
      </div>

      <div className="relative flex-1 min-w-[220px]">
        {isPending ? (
          <Loader2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 animate-spin" />
        ) : (
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        )}
        <input
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search event, session id or model…"
          className="w-full text-xs pl-9 pr-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        />
      </div>
    </div>
  );
};
