'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2, AlertCircle } from 'lucide-react';

interface ForgetSessionButtonProps {
  sessionId: string;
}

/**
 * Deletes the session for real (turns and retained facts cascade), rather than hiding
 * it in local state. Two clicks are required because it cannot be undone.
 */
export const ForgetSessionButton: React.FC<ForgetSessionButtonProps> = ({ sessionId }) => {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setDeleting(true);
    setError('');

    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
      router.replace('/memory');
      router.refresh();
    } catch {
      setError('Could not delete');
      setDeleting(false);
      setConfirming(false);
    }
  };

  if (error) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 shrink-0">
        <AlertCircle className="w-3.5 h-3.5" />
        {error}
      </span>
    );
  }

  return (
    <button
      onClick={handleDelete}
      onBlur={() => setConfirming(false)}
      disabled={deleting}
      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 disabled:opacity-60 ${
        confirming
          ? 'bg-rose-600 text-white'
          : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 hover:bg-rose-600 hover:text-white'
      }`}
    >
      {deleting ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Trash2 className="w-3.5 h-3.5" />
      )}
      <span>{confirming ? 'Delete permanently?' : 'Forget this session'}</span>
    </button>
  );
};
