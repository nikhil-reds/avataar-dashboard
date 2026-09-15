import React from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import {
  buildSearchString,
  formatDuration,
  formatStamp,
  isStale,
  SORT_FIELDS,
  SORT_LABELS,
  type ConversationQuery,
  type SortField,
} from '@/lib/conversationQuery';
import type { ConversationRow } from '@/lib/conversations';
import { TAB_BY_ID } from '@/data/navigation';

interface ConversationTableProps {
  rows: ConversationRow[];
  query: ConversationQuery;
  selectedId: string | null;
  total: number;
}

// Below `md` the row renders as a stacked card instead; these tracks apply at `md`+.
// Sorting moves to the filter bar there, since the sort controls live in the header row.
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
    TAB_BY_ID.conversations.href +
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

      {/* The sort controls live in the column header, which is hidden on a phone —
          so they reappear here as pills. Same links, same params. */}
      <div className="md:hidden flex items-center gap-1.5 px-3 py-2 overflow-x-auto bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
        <span className="font-mono text-[10px] font-bold tracking-wider uppercase text-zinc-400 shrink-0">
          sort
        </span>
        {SORT_FIELDS.map((field) => {
          const isActive = query.sort === field;
          const nextDir = isActive && query.dir === 'desc' ? 'asc' : 'desc';
          return (
            <Link
              key={field}
              href={
                TAB_BY_ID.conversations.href +
                buildSearchString(query, { sort: field, dir: nextDir, page: 1 }, selectedId)
              }
              scroll={false}
              className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
              }`}
            >
              {SORT_LABELS[field]}
              {isActive &&
                (query.dir === 'desc' ? (
                  <ArrowDown className="w-3 h-3" />
                ) : (
                  <ArrowUp className="w-3 h-3" />
                ))}
            </Link>
          );
        })}
      </div>

      <div
        className={`hidden md:grid ${GRID} px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 font-mono text-[10px] font-bold tracking-wider uppercase text-zinc-400`}
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
              href={TAB_BY_ID.conversations.href + buildSearchString(query, { selected: row.id })}
              scroll={false}
              className={`block transition-colors text-xs ${
                isSelected
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/30 ring-1 ring-inset ring-indigo-500/40'
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
              }`}
            >
              {/* Phone: title and status stay prominent; the three numeric columns
                  become one meta line. */}
              <div className="md:hidden flex flex-col gap-1 px-3 py-3">
                <div className="flex justify-between items-start gap-2">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100 min-w-0">
                    {row.title ?? 'Untitled conversation'}
                  </span>
                  <span className="shrink-0 font-mono text-[11.5px] text-zinc-600 dark:text-zinc-400">
                    {row.turnCount} {row.turnCount === 1 ? 'turn' : 'turns'}
                  </span>
                </div>
                <div className={`text-[11px] ${statusColor}`}>
                  {statusLabel} · <span className="font-mono">{row.id.slice(0, 8)}</span>
                </div>
                <div className="font-mono text-[11px] text-zinc-400 flex flex-wrap gap-x-1.5">
                  <span>{formatStamp(row.startedAt)}</span>
                  <span className="text-zinc-300 dark:text-zinc-600">·</span>
                  <span>{formatDuration(row.durationSec)}</span>
                </div>
              </div>

              <div className={`hidden md:grid ${GRID} px-3 py-3 items-center`}>
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
