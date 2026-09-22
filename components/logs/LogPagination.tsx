import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import {
  buildLogSearch,
  LOG_PER_PAGE_OPTIONS,
  type LogQuery,
} from '@/lib/logQuery';
import { TAB_BY_ID } from '@/data/navigation';

interface LogPaginationProps {
  query: LogQuery;
  pageCount: number;
  matching: number;
  selectedId: string | null;
}

const BUTTON =
  'flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors';
const DISABLED =
  'flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg border border-zinc-100 dark:border-zinc-800 text-zinc-300 dark:text-zinc-700 cursor-not-allowed';

/**
 * The page numbers to render: always the first and last, plus a window around the
 * current page. `null` marks a gap, so a hundred pages still fit on one line.
 */
function pageWindow(page: number, pageCount: number): (number | null)[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);

  const pages = new Set<number>([1, pageCount, page]);
  if (page - 1 > 1) pages.add(page - 1);
  if (page + 1 < pageCount) pages.add(page + 1);
  // Keep the row a constant width near the ends, where the window is one-sided.
  if (page <= 3) [2, 3, 4].forEach((n) => n < pageCount && pages.add(n));
  if (page >= pageCount - 2) {
    [pageCount - 3, pageCount - 2, pageCount - 1].forEach((n) => n > 1 && pages.add(n));
  }

  const ordered = [...pages].sort((a, b) => a - b);
  const withGaps: (number | null)[] = [];
  ordered.forEach((value, index) => {
    if (index > 0 && value - ordered[index - 1] > 1) withGaps.push(null);
    withGaps.push(value);
  });
  return withGaps;
}

export const LogPagination: React.FC<LogPaginationProps> = ({
  query,
  pageCount,
  matching,
  selectedId,
}) => {
  const href = (overrides: Partial<LogQuery>) =>
    TAB_BY_ID.logs.href + buildLogSearch(query, overrides, selectedId);

  const firstRow = matching === 0 ? 0 : (query.page - 1) * query.perPage + 1;
  const lastRow = Math.min(query.page * query.perPage, matching);
  const atStart = query.page <= 1;
  const atEnd = query.page >= pageCount;

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="font-mono text-[11px] text-zinc-400">
          {firstRow}–{lastRow} of {matching}
        </span>

        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
            per page
          </span>
          {LOG_PER_PAGE_OPTIONS.map((size) => (
            <Link
              key={size}
              // Page 1: a row that was on page 4 of 25 is not on page 4 of 100.
              href={href({ perPage: size, page: 1 })}
              scroll={false}
              className={`font-mono text-[11px] px-1.5 py-0.5 rounded transition-colors ${
                query.perPage === size
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {size}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {atStart ? (
          <span className={DISABLED} aria-hidden>
            <ChevronsLeft className="w-3.5 h-3.5" />
          </span>
        ) : (
          <Link href={href({ page: 1 })} scroll={false} aria-label="First page" className={BUTTON}>
            <ChevronsLeft className="w-3.5 h-3.5" />
          </Link>
        )}

        {atStart ? (
          <span className={DISABLED} aria-hidden>
            <ChevronLeft className="w-3.5 h-3.5" />
          </span>
        ) : (
          <Link
            href={href({ page: query.page - 1 })}
            scroll={false}
            aria-label="Previous page"
            className={BUTTON}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Link>
        )}

        <div className="flex items-center gap-1">
          {pageWindow(query.page, pageCount).map((value, index) =>
            value === null ? (
              <span
                key={`gap-${index}`}
                className="font-mono text-[11px] text-zinc-300 dark:text-zinc-700 px-1"
              >
                …
              </span>
            ) : (
              <Link
                key={value}
                href={href({ page: value })}
                scroll={false}
                aria-current={value === query.page ? 'page' : undefined}
                className={`font-mono text-[11.5px] min-w-7 text-center px-2 py-1.5 rounded-lg border transition-colors ${
                  value === query.page
                    ? 'border-indigo-500 bg-indigo-600 text-white font-semibold'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                }`}
              >
                {value}
              </Link>
            )
          )}
        </div>

        {atEnd ? (
          <span className={DISABLED} aria-hidden>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        ) : (
          <Link
            href={href({ page: query.page + 1 })}
            scroll={false}
            aria-label="Next page"
            className={BUTTON}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}

        {atEnd ? (
          <span className={DISABLED} aria-hidden>
            <ChevronsRight className="w-3.5 h-3.5" />
          </span>
        ) : (
          <Link
            href={href({ page: pageCount })}
            scroll={false}
            aria-label="Last page"
            className={BUTTON}
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
};
