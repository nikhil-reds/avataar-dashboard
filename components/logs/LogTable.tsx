import React from 'react';
import Link from 'next/link';
import { LogStatus } from '@prisma/client';
import type { ActivityRecord } from '../../lib/activity';
import type { LogKindFilter } from '../../lib/logKinds';
import { formatStamp } from '../../lib/conversationQuery';

interface LogTableProps {
  records: ActivityRecord[];
  selectedId: string | null;
  kind: LogKindFilter;
  searchQuery: string;
}

const GRID = 'grid grid-cols-[88px_1fr_92px_70px] gap-2';

function hrefFor(id: string, kind: LogKindFilter, searchQuery: string): string {
  const params = new URLSearchParams();
  if (kind !== 'all') params.set('kind', kind);
  if (searchQuery) params.set('q', searchQuery);
  params.set('selected', id);
  return '/activelog?' + params.toString();
}

export const LogTable: React.FC<LogTableProps> = ({
  records,
  selectedId,
  kind,
  searchQuery,
}) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <div
        className={`${GRID} px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 font-mono text-[10px] font-bold tracking-wider uppercase text-zinc-400`}
      >
        <div>time</div>
        <div>event</div>
        <div>model</div>
        <div>latency</div>
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
              href={hrefFor(row.id, kind, searchQuery)}
              scroll={false}
              className={`${GRID} px-3 py-3 items-center transition-colors text-xs ${
                isSelected
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-l-4 border-indigo-600 pl-2'
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
              }`}
            >
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
            </Link>
          );
        })}

        {records.length === 0 && (
          <div className="p-8 text-center text-xs text-zinc-400">
            No activity recorded yet. Events appear here as sessions run and requests are
            served.
          </div>
        )}
      </div>
    </div>
  );
};
