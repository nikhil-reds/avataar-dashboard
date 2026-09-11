'use client';

import React, { useCallback, useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';

interface CatalogueSearchProps {
  searchQuery: string;
  matching: number;
  total: number;
}

export const CatalogueSearch: React.FC<CatalogueSearchProps> = ({
  searchQuery,
  matching,
  total,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [term, setTerm] = useState(searchQuery);
  const [lastQuery, setLastQuery] = useState(searchQuery);

  if (searchQuery !== lastQuery) {
    setLastQuery(searchQuery);
    setTerm(searchQuery);
  }

  const push = useCallback(
    (value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set('q', value);
      else next.delete('q');
      const qs = next.toString();
      startTransition(() => router.replace(pathname + (qs ? '?' + qs : ''), { scroll: false }));
    },
    [params, pathname, router]
  );

  useEffect(() => {
    if (term === searchQuery) return;
    const timer = setTimeout(() => push(term), 350);
    return () => clearTimeout(timer);
  }, [term, searchQuery, push]);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-[260px]">
        {isPending ? (
          <Loader2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 animate-spin" />
        ) : (
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        )}
        <input
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Filter by name, SKU, category or supplier…"
          className="w-full text-xs pl-9 pr-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        />
      </div>
      <div className="font-mono text-xs text-zinc-500">
        {matching} of {total} SKUs
      </div>
    </div>
  );
};
