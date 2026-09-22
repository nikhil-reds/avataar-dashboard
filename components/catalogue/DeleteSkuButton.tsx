'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface DeleteSkuButtonProps {
  id: string;
  sku: string;
  name: string;
  /** Where to land if the row being deleted is the one open in the detail panel. */
  listHref: string;
  isSelected?: boolean;
}

export const DeleteSkuButton: React.FC<DeleteSkuButtonProps> = ({
  id,
  sku,
  name,
  listHref,
  isSelected = false,
}) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpen(false);
    setError('');
    // Send focus back where it came from, rather than to the top of the document.
    triggerRef.current?.focus();
  };

  const handleDelete = async () => {
    if (busy) return;
    setBusy(true);
    setError('');

    try {
      const res = await fetch(`/api/skus/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // The dialog stays open on failure: closing it would hide the reason.
        setError(data.error ?? 'Delete failed');
        return;
      }

      setOpen(false);
      // The listing is server-rendered, so ask for fresh HTML. If this row is the one
      // open in the panel, leave the selection behind first or the panel would try to
      // reopen a product that no longer exists.
      if (isSelected) router.push(listHref, { scroll: false });
      router.refresh();
    } catch {
      setError('Could not reach the server');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        title={`Delete ${sku}`}
        aria-label={`Delete ${name}`}
        aria-haspopup="dialog"
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-zinc-300 dark:text-zinc-600 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {open && (
        <ConfirmDeleteModal
          sku={sku}
          name={name}
          busy={busy}
          error={error}
          onCancel={close}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
};
