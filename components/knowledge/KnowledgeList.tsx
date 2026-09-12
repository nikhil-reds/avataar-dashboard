'use client';

import React from 'react';
import type { KnowledgeRecord } from '../../lib/knowledge';
import { Pencil, EyeOff, Eye, Trash2, Loader2 } from 'lucide-react';

interface KnowledgeListProps {
  rows: KnowledgeRecord[];
  hasQuery: boolean;
  /** Id of the row a request is currently in flight for. */
  busyId: string | null;
  editingId: string | null;
  onEdit: (row: KnowledgeRecord) => void;
  onToggleActive: (row: KnowledgeRecord) => void;
  onDelete: (row: KnowledgeRecord) => void;
}

const PREVIEW_CHARS = 220;

const DATE = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export const KnowledgeList: React.FC<KnowledgeListProps> = ({
  rows,
  hasQuery,
  busyId,
  editingId,
  onEdit,
  onToggleActive,
  onDelete,
}) => {
  if (rows.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center text-xs text-zinc-500">
        {hasQuery
          ? 'No knowledge matches that search.'
          : 'No knowledge yet. Add the first entry above and the avatar can use it straight away.'}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => {
        const busy = busyId === row.id;
        const preview =
          row.content.length > PREVIEW_CHARS
            ? `${row.content.slice(0, PREVIEW_CHARS)}…`
            : row.content;

        return (
          <article
            key={row.id}
            className={`bg-white dark:bg-zinc-900 border rounded-xl p-4 flex flex-col gap-2.5 shadow-sm transition-colors ${
              editingId === row.id
                ? 'border-indigo-400 dark:border-indigo-500'
                : 'border-zinc-200 dark:border-zinc-800'
            } ${row.isActive ? '' : 'opacity-70'}`}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex flex-col gap-1 min-w-0">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                  {row.title ?? 'Untitled entry'}
                </h3>
                <div className="flex items-center gap-2 flex-wrap font-mono text-[10px] uppercase tracking-wider">
                  {row.category && (
                    <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                      {row.category}
                    </span>
                  )}
                  <span
                    className={`px-1.5 py-0.5 rounded font-semibold ${
                      row.isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {row.isActive ? 'active' : 'inactive'}
                  </span>
                  <span className="text-zinc-400">{DATE.format(row.createdAt)}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {busy && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />}
                <button
                  onClick={() => onEdit(row)}
                  disabled={busy}
                  title="Edit"
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onToggleActive(row)}
                  disabled={busy}
                  title={row.isActive ? 'Deactivate' : 'Reactivate'}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {row.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => onDelete(row)}
                  disabled={busy}
                  title="Delete permanently"
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
              {preview}
            </p>

            {row.keywords.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {row.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
};
