import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buildSearchString, type ConversationQuery } from '@/lib/conversationQuery';

interface PaginationProps {
  query: ConversationQuery;
  pageCount: number;
  total: number;
  perPage: number;
  selectedId: string | null;
}

export const Pagination: React.FC<PaginationProps> = ({
  query,
  pageCount,
  total,
  perPage,
  selectedId,
}) => {
  if (pageCount <= 1) return null;

  const firstRow = (query.page - 1) * perPage + 1;
  const lastRow = Math.min(query.page * perPage, total);

  const linkClass =
    'flex items-center gap-1 text-[12px] font-semibold px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors';
  const disabledClass =
    'flex items-center gap-1 text-[12px] font-semibold px-3 py-1.5 rounded-lg border border-zinc-100 dark:border-zinc-800 text-zinc-300 dark:text-zinc-700 cursor-not-allowed';

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="font-mono text-[11px] text-zinc-400">
        {firstRow}–{lastRow} of {total}
      </div>

      <div className="flex items-center gap-2">
        {query.page > 1 ? (
          <Link
            href={'/conversations' + buildSearchString(query, { page: query.page - 1 }, selectedId)}
            scroll={false}
            className={linkClass}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </Link>
        ) : (
          <span className={disabledClass}>
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </span>
        )}

        <span className="font-mono text-[11px] text-zinc-500">
          {query.page} / {pageCount}
        </span>

        {query.page < pageCount ? (
          <Link
            href={'/conversations' + buildSearchString(query, { page: query.page + 1 }, selectedId)}
            scroll={false}
            className={linkClass}
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <span className={disabledClass}>
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </div>
  );
};
