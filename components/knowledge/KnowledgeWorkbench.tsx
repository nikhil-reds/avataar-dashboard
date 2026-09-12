'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KnowledgeForm } from './KnowledgeForm';
import { KnowledgeList } from './KnowledgeList';
import type { KnowledgeRecord } from '../../lib/knowledge';
import { KnowledgeFormState } from '../../types';

interface KnowledgeWorkbenchProps {
  rows: KnowledgeRecord[];
  hasQuery: boolean;
}

const EMPTY_FORM: KnowledgeFormState = {
  title: '',
  content: '',
  category: '',
  keywords: '',
  source: '',
  isActive: true,
};

/**
 * Coordinates the form and the list.
 *
 * The rows come from the server component above, so after every write the page is
 * refreshed rather than the list being patched locally — the admin then sees exactly what
 * the database holds, which is also what the avatar will retrieve.
 */
export const KnowledgeWorkbench: React.FC<KnowledgeWorkbenchProps> = ({ rows, hasQuery }) => {
  const router = useRouter();
  const [form, setForm] = useState<KnowledgeFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const clearMessages = () => {
    setNotice('');
    setError('');
  };

  const handleChangeField = useCallback(
    <K extends keyof KnowledgeFormState>(key: K, value: KnowledgeFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      clearMessages();
    },
    []
  );

  const handleReset = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    clearMessages();
  }, []);

  const handleSave = useCallback(async () => {
    if (saving) return;

    // Mirrors the server's own rule, so the obvious mistake is caught without a round trip.
    if (!form.content.trim()) {
      setError('Knowledge content cannot be empty');
      return;
    }

    setSaving(true);
    clearMessages();

    try {
      const res = await fetch(editingId ? `/api/knowledge/${editingId}` : '/api/knowledge', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Could not save the knowledge entry');
        return;
      }

      setNotice(
        editingId
          ? 'Updated. The avatar uses this from its next answer.'
          : 'Saved. The avatar can use this straight away.'
      );
      setForm(EMPTY_FORM);
      setEditingId(null);
      router.refresh();
    } catch {
      setError('Could not reach the server');
    } finally {
      setSaving(false);
    }
  }, [editingId, form, router, saving]);

  const handleEdit = useCallback((row: KnowledgeRecord) => {
    setEditingId(row.id);
    setForm({
      title: row.title ?? '',
      content: row.content,
      category: row.category ?? '',
      keywords: row.keywords.join(', '),
      source: row.source ?? '',
      isActive: row.isActive,
    });
    clearMessages();
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleToggleActive = useCallback(
    async (row: KnowledgeRecord) => {
      setBusyId(row.id);
      clearMessages();

      try {
        const res = await fetch(`/api/knowledge/${row.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: !row.isActive }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? 'Could not update the entry');
          return;
        }

        setNotice(row.isActive ? 'Deactivated — the avatar will not use it' : 'Reactivated');
        router.refresh();
      } catch {
        setError('Could not reach the server');
      } finally {
        setBusyId(null);
      }
    },
    [router]
  );

  const handleDelete = useCallback(
    async (row: KnowledgeRecord) => {
      const label = row.title ?? 'this entry';
      // Deactivating is the reversible option and is one click away, so the permanent
      // one asks first.
      if (!window.confirm(`Permanently delete "${label}"? Deactivating instead keeps it.`)) return;

      setBusyId(row.id);
      clearMessages();

      try {
        const res = await fetch(`/api/knowledge/${row.id}?hard=true`, { method: 'DELETE' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? 'Could not delete the entry');
          return;
        }

        if (editingId === row.id) handleReset();
        setNotice('Deleted');
        router.refresh();
      } catch {
        setError('Could not reach the server');
      } finally {
        setBusyId(null);
      }
    },
    [editingId, handleReset, router]
  );

  return (
    <div className="flex flex-col gap-6">
      <KnowledgeForm
        form={form}
        editingId={editingId}
        onChangeField={handleChangeField}
        notice={notice}
        error={error}
        saving={saving}
        onSave={handleSave}
        onReset={handleReset}
      />

      <KnowledgeList
        rows={rows}
        hasQuery={hasQuery}
        busyId={busyId}
        editingId={editingId}
        onEdit={handleEdit}
        onToggleActive={handleToggleActive}
        onDelete={handleDelete}
      />
    </div>
  );
};
