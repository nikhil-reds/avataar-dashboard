'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  sku: string;
  name: string;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation for a delete that cannot be undone.
 *
 * Rendered through a portal on `document.body` so the dialog is never clipped or
 * stacked beneath the table row it was triggered from, and above the detail drawer
 * (z-40) and the navigation drawer (z-50).
 */
export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  sku,
  name,
  busy,
  error,
  onCancel,
  onConfirm,
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Opens on the safe choice, so Enter or a stray Space does not delete anything.
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

      // Keep Tab inside the dialog: behind it sits a whole page of controls that
      // should not be reachable while a destructive choice is pending.
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

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        aria-label="Cancel"
        tabIndex={-1}
        onClick={() => {
          if (!busy) onCancel();
        }}
        className="absolute inset-0 bg-zinc-950/50 backdrop-blur-[1px] cursor-default"
      />

      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-sku-title"
        aria-describedby="delete-sku-body"
        className="relative w-full sm:max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 flex flex-col gap-4"
      >
        <div className="flex items-start gap-3">
          <span className="shrink-0 w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </span>

          <div className="flex flex-col gap-1 min-w-0">
            <h2
              id="delete-sku-title"
              className="text-sm font-bold text-zinc-900 dark:text-white"
            >
              Delete this product?
            </h2>
            <p id="delete-sku-body" className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              The avatar stops being able to talk about it straight away, and the row
              cannot be recovered.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30 px-3.5 py-3 flex flex-col gap-0.5">
          <span className="font-mono text-[10.5px] font-semibold text-zinc-500">{sku}</span>
          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 break-words">
            {name}
          </span>
        </div>

        {error && (
          <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="text-xs font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all px-4 py-2 rounded-lg cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all px-4 py-2 rounded-lg cursor-pointer shadow-xs"
          >
            {busy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span>{busy ? 'Deleting…' : 'Delete product'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
