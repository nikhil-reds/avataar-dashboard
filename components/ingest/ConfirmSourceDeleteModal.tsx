'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, FileText, Loader2, Trash2 } from 'lucide-react';

import type { IngestSourceRow } from '@/types';
import { formatBytes } from '@/lib/pageIndex';

interface ConfirmSourceDeleteModalProps {
  source: IngestSourceRow;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmSourceDeleteModal({
  source,
  busy,
  error,
  onCancel,
  onConfirm,
}: ConfirmSourceDeleteModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        onCancel();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button');
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onCancel]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const sourceType = source.kind === 'TEXT' ? 'Pasted text' : source.ext.toUpperCase();

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Cancel"
        tabIndex={-1}
        onClick={() => {
          if (!busy) onCancel();
        }}
        className="absolute inset-0 cursor-default bg-zinc-950/50 backdrop-blur-[1px]"
      />

      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-source-title"
        aria-describedby="delete-source-body"
        className="relative flex w-full flex-col gap-4 rounded-t-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/40">
            <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
          </span>

          <div className="flex min-w-0 flex-col gap-1">
            <h2
              id="delete-source-title"
              className="text-sm font-bold text-zinc-900 dark:text-white"
            >
              Delete this source?
            </h2>
            <p
              id="delete-source-body"
              className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400"
            >
              This removes the stored source and any indexed chunks that depend on it.
              Uploaded files are also removed from server storage.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 px-3.5 py-3 dark:border-zinc-800 dark:bg-zinc-800/30">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs font-semibold text-zinc-900 break-words dark:text-zinc-100">
              {source.title}
            </span>
            <span className="font-mono text-[10.5px] font-semibold text-zinc-500">
              {sourceType} · {formatBytes(source.sizeBytes)}
              {source.status === 'INDEXED' ? ' · indexed' : ''}
            </span>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="cursor-pointer rounded-lg bg-zinc-100 px-4 py-2 text-xs font-medium text-zinc-600 transition-all hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-rose-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            <span>{busy ? 'Deleting...' : 'Delete source'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
