import React from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import {
  buildSearchString,
  formatDuration,
  formatStamp,
  isStale,
  SORT_LABELS,
  type ConversationQuery,
  type SortField,
} from '@/lib/conversationQuery';
import type { ConversationRow } from '@/lib/conversations';

interface ConversationTableProps {
  rows: ConversationRow[];
  query: ConversationQuery;
  selectedId: string | null;
  total: number;
}

const GRID = 'grid grid-cols-[1fr_92px_64px_78px] gap-2';

function SortHeader({
  field,
  query,
  selectedId,
}: {
  field: SortField;
  query: ConversationQuery;
  selectedId: string | null;
}) {
  const isActive = query.sort === field;
  // Clicking the active column flips direction; a new column starts descending, which
  // is what you want for every one of these (newest, most turns, longest).
  const nextDir = isActive && query.dir === 'desc' ? 'asc' : 'desc';
  const href =
    '/conversations' +
    buildSearchString(query, { sort: field, dir: nextDir, page: 1 }, selectedId);

  return (
    <Link
      href={href}
      scroll={false}
      className={`flex items-center gap-1 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors ${
        isActive ? 'text-indigo-600 dark:text-indigo-400' : ''
      }`}
    >
      <span>{SORT_LABELS[field]}</span>
      {isActive ? (
        query.dir === 'desc' ? (
          <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUp className="w-3 h-3" />
        )
      ) : (
        <ChevronsUpDown className="w-3 h-3 opacity-40" />
      )}
    </Link>
  );
}

export const ConversationTable: React.FC<ConversationTableProps> = ({
  rows,
  query,
  selectedId,
  total,
}) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-baseline justify-between gap-2 bg-zinc-50/50 dark:bg-zinc-800/30">
        <div className="text-sm font-semibold text-zinc-900 dark:text-white">Conversations</div>
        <div className="font-mono text-[10.5px] text-zinc-400">
          {total} {total === 1 ? 'session' : 'sessions'}
        </div>
      </div>

      <div
        className={`${GRID} px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 font-mono text-[10px] font-bold tracking-wider uppercase text-zinc-400`}
      >
        <div>session</div>
        <SortHeader field="startedAt" query={query} selectedId={selectedId} />
        <SortHeader field="turnCount" query={query} selectedId={selectedId} />
        <SortHeader field="durationSec" query={query} selectedId={selectedId} />
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {rows.map((row) => {
          const isSelected = row.id === selectedId;
          const stale = isStale(row.status, row.lastTurnAt, row.startedAt);

          let statusLabel: string = row.status.toLowerCase();
          let statusColor = 'text-zinc-500';
          if (row.status === 'LIVE' && !stale) {
            statusLabel = 'live';
            statusColor = 'text-emerald-600 dark:text-emerald-400 font-semibold';
          } else if (row.status === 'LIVE' && stale) {
            statusLabel = 'abandoned';
            statusColor = 'text-amber-600 dark:text-amber-400 font-semibold';
          } else if (row.status === 'ERROR') {
            statusColor = 'text-rose-500 font-semibold';
          }

          return (
            <Link
              key={row.id}
              href={'/conversations' + buildSearchString(query, { selected: row.id })}
              scroll={false}
              className={`${GRID} px-3 py-3 items-center transition-colors text-xs ${
                isSelected
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-l-4 border-indigo-600 pl-2'
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
              }`}
            >
              <div className="min-w-0 pr-2">
                <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {row.title ?? 'Untitled conversation'}
                </div>
                <div className={`text-[11px] ${statusColor}`}>
                  {statusLabel} · <span className="font-mono">{row.id.slice(0, 8)}</span>
                </div>
              </div>
              <div className="font-mono text-zinc-600 dark:text-zinc-400 text-[11.5px]">
                {formatStamp(row.startedAt)}
              </div>
              <div className="font-mono text-zinc-600 dark:text-zinc-400 text-[11.5px]">
                {row.turnCount}
              </div>
              <div className="font-mono text-zinc-600 dark:text-zinc-400 text-[11.5px]">
                {formatDuration(row.durationSec)}
              </div>
            </Link>
          );
        })}

        {rows.length === 0 && (
          <div className="p-8 text-center text-xs text-zinc-400">
            No conversations match these filters.
          </div>
        )}
      </div>
    </div>
  );
};
