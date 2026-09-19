import React from 'react';
import Link from 'next/link';
import { LogStatus } from '@prisma/client';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import type { ActivityRecord } from '../../lib/activity';
import {
  buildLogSearch,
  LOG_SORT_LABELS,
  type LogQuery,
  type LogSortField,
} from '../../lib/logQuery';
import { formatStamp } from '../../lib/conversationQuery';
import { TAB_BY_ID } from '../../data/navigation';

interface LogTableProps {
  records: ActivityRecord[];
  selectedId: string | null;
  query: LogQuery;
  filtered: boolean;
}

// Below `md` the row renders as a stacked card instead; these tracks apply at `md`+.
const GRID = 'grid grid-cols-[88px_1fr_92px_70px] gap-2';

/**
 * A sortable column heading. Clicking the active column flips the direction; a new
 * column starts descending, which is what you want for a time or a latency.
 */
const SortHeader: React.FC<{
  field: LogSortField;
  query: LogQuery;
  className?: string;
}> = ({ field, query, className = '' }) => {
  const isActive = query.sort === field;
  const nextDir = isActive && query.dir === 'desc' ? 'asc' : 'desc';
  const Icon = !isActive ? ChevronsUpDown : query.dir === 'desc' ? ArrowDown : ArrowUp;

  return (
    <Link
      href={
        TAB_BY_ID.logs.href +
        buildLogSearch(query, { sort: field, dir: nextDir, page: 1 })
      }
      scroll={false}
      aria-label={`Sort by ${LOG_SORT_LABELS[field]}, ${nextDir}ending`}
      className={`flex items-center gap-1 transition-colors cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-200 ${
        isActive ? 'text-indigo-600 dark:text-indigo-400' : ''
      } ${className}`}
    >
      <span>{LOG_SORT_LABELS[field].toLowerCase()}</span>
      <Icon className={`w-3 h-3 ${isActive ? '' : 'opacity-40'}`} />
    </Link>
  );
};

export const LogTable: React.FC<LogTableProps> = ({
  records,
  selectedId,
  query,
  filtered,
}) => {
  const hrefFor = (id: string) =>
    TAB_BY_ID.logs.href + buildLogSearch(query, { selected: id });

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <div
        className={`hidden md:grid ${GRID} px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 font-mono text-[10px] font-bold tracking-wider uppercase text-zinc-400`}
      >
        <SortHeader field="createdAt" query={query} />
        <SortHeader field="event" query={query} />
        <SortHeader field="model" query={query} />
        <SortHeader field="latencyMs" query={query} />
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {records.map((row) => {
          const isSelected = row.id === selectedId;

          let statusColor = 'text-zinc-500';
          if (row.status === LogStatus.ERROR) statusColor = 'text-rose-500 font-semibold';
          else if (row.status === LogStatus.ESCALATED) statusColor = 'text-amber-600 font-semibold';

          return (
            <Link
              key={row.id}
              href={hrefFor(row.id)}
              scroll={false}
              className={`block transition-colors text-xs ${
                isSelected
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/30 ring-1 ring-inset ring-indigo-500/40'
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
              }`}
            >
              {/* Phone: event first, because that is what you scan for; the time and
                  measurement drop to a meta line. */}
              <div className="md:hidden flex flex-col gap-1 px-3 py-3">
                <div className="flex justify-between items-start gap-2">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100 min-w-0">
                    {row.event}
                  </span>
                  <span className="shrink-0 font-mono text-[11.5px] text-zinc-600 dark:text-zinc-400">
                    {row.latencyMs === null ? '—' : row.latencyMs + 'ms'}
                  </span>
                </div>
                <div className={`text-[11px] ${statusColor}`}>
                  {row.status.toLowerCase()} · {row.kind.toLowerCase()}
                  {row.sessionId ? ' · ' + row.sessionId.slice(0, 8) : ''}
                </div>
                <div className="font-mono text-[11px] text-zinc-400 flex flex-wrap gap-x-1.5">
                  <span>{formatStamp(row.createdAt)}</span>
                  <span className="text-zinc-300 dark:text-zinc-600">·</span>
                  <span className="truncate">{row.model ?? '—'}</span>
                </div>
              </div>

              <div className={`hidden md:grid ${GRID} px-3 py-3 items-center`}>
                <div className="font-mono text-zinc-500 text-[11.5px]">
                  {formatStamp(row.createdAt)}
                </div>
                <div className="min-w-0 pr-2">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {row.event}
                  </div>
                  <div className={`text-[11px] ${statusColor}`}>
                    {row.status.toLowerCase()} · {row.kind.toLowerCase()}
                    {row.sessionId ? ' · ' + row.sessionId.slice(0, 8) : ''}
                  </div>
                </div>
                <div className="font-mono text-zinc-600 dark:text-zinc-400 text-[11.5px] truncate">
                  {row.model ?? '—'}
                </div>
                <div className="font-mono text-zinc-600 dark:text-zinc-400 text-[11.5px]">
                  {row.latencyMs === null ? '—' : row.latencyMs + 'ms'}
                </div>
              </div>
            </Link>
          );
        })}

        {records.length === 0 && (
          <div className="p-8 text-center text-xs text-zinc-400">
            {filtered
              ? 'No events match these filters.'
              : 'No activity recorded yet. Events appear here as sessions run and requests are served.'}
          </div>
        )}
      </div>
    </div>
  );
};
