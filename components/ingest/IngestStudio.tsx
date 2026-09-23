'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { SourceStager } from './SourceStager';
import { PageIndexPreview } from './PageIndexPreview';
import { ConfirmSourceDeleteModal } from './ConfirmSourceDeleteModal';
import type {
  IngestSourceRow,
  PageIndexDoc,
  PendingUpload,
} from '../../types';
import { formatBytes, MAX_SOURCE_BYTES, specForFile } from '../../lib/pageIndex';

interface IngestStudioProps {
  /** Rendered on the server so the bench is populated on first paint. */
  initialSources: IngestSourceRow[];
  initialIndex: PageIndexDoc | null;
}

interface SourcesResponse {
  created?: IngestSourceRow[];
  rejected?: { name: string; reason: string }[];
  error?: string;
}

/**
 * Staging bench for ingest sources. Uploads and pasted text are stored through
 * /api/ingest/sources, and the page index is built and persisted by /api/ingest/index —
 * the browser only renders what the server returns.
 */
export const IngestStudio: React.FC<IngestStudioProps> = ({
  initialSources,
  initialIndex,
}) => {
  const router = useRouter();
  const [sources, setSources] = useState<IngestSourceRow[]>(initialSources);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [index, setIndex] = useState<PageIndexDoc | null>(initialIndex);
  const [building, setBuilding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<IngestSourceRow | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const nextTempId = useRef(1);

  // An index is stale when the set of sources no longer matches what it was built over.
  const stale = useMemo(() => {
    if (!index) return false;
    const indexed = new Set(index.documents.map((doc) => doc.sourceId));
    if (indexed.size !== sources.length) return true;
    return sources.some((source) => !indexed.has(source.id));
  }, [index, sources]);

  const handleAddFiles = async (files: File[]) => {
    const problems: string[] = [];
    const accepted: File[] = [];

    // Checked here for instant feedback; the route enforces the same rules, since the
    // browser is not the only thing that can call it.
    for (const file of files) {
      if (!specForFile(file.name)) {
        problems.push(`${file.name} — unsupported file type`);
        continue;
      }
      if (file.size > MAX_SOURCE_BYTES) {
        problems.push(
          `${file.name} — ${formatBytes(file.size)} exceeds the ${formatBytes(
            MAX_SOURCE_BYTES
          )} limit`
        );
        continue;
      }
      accepted.push(file);
    }

    setRejected(problems);
    if (accepted.length === 0) return;

    const uploads: PendingUpload[] = accepted.map((file) => ({
      tempId: `tmp_${nextTempId.current++}`,
      name: file.name,
      sizeBytes: file.size,
    }));
    const tempIds = new Set(uploads.map((upload) => upload.tempId));

    setPending((prev) => [...prev, ...uploads]);
    setError('');
/* progress step 1 */

    const form = new FormData();
    for (const file of accepted) form.append('files', file);

    try {
      const res = await fetch('/api/ingest/sources', { method: 'POST', body: form });
      const data: SourcesResponse = await res.json();

      if (data.created?.length) {
        setSources((prev) => [...data.created!, ...prev]);
      }

      const serverProblems = (data.rejected ?? []).map(
        (entry) => `${entry.name} — ${entry.reason.toLowerCase()}`
      );

      if (!res.ok && !data.created?.length && serverProblems.length === 0) {
        setError(data.error ?? 'Upload failed');
      }

      setRejected([...problems, ...serverProblems]);
      router.refresh();
    } catch {
      setError('Could not reach the server');
    } finally {
      setPending((prev) => prev.filter((upload) => !tempIds.has(upload.tempId)));
    }
  };

  const handleAddText = async (title: string, body: string) => {
    setBusy(true);
    setError('');

    try {
      const res = await fetch('/api/ingest/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body }),
      });
      const data: SourcesResponse = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Could not store this text');
        return;
      }

      if (data.created?.length) setSources((prev) => [...data.created!, ...prev]);
      setRejected([]);
      router.refresh();
    } catch {
      setError('Could not reach the server');
    } finally {
      setBusy(false);
    }
  };

  const requestRemove = (id: string) => {
    const source = sources.find((row) => row.id === id);
    if (!source) return;

    setDeleteTarget(source);
    setDeleteError('');
    setError('');
  };

  const confirmRemove = async () => {
    if (!deleteTarget || deleting) return;

    setDeleting(true);
    setDeleteError('');

    try {
      const res = await fetch(`/api/ingest/sources/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error ?? 'Could not delete this source');
        return;
      }

      setSources((prev) => prev.filter((row) => row.id !== deleteTarget.id));
      setRejected([]);
      setDeleteTarget(null);
      router.refresh();
    } catch {
      setDeleteError('Could not reach the server');
    } finally {
      setDeleting(false);
    }
  };

  const handleBuild = async () => {
    if (building || sources.length === 0) return;
    setBuilding(true);
    setError('');

    try {
      const res = await fetch('/api/ingest/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIds: sources.map((source) => source.id) }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Could not build the page index');
        return;
      }

      setIndex(data as PageIndexDoc);
      // Statuses move to INDEXED, and the server-rendered listing should say so.
      router.refresh();
    } catch {
      setError('Could not reach the server');
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div id="add-source" className="flex flex-col gap-4 scroll-mt-24">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={handleBuild}
          disabled={building || sources.length === 0}
          className="flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all px-4 py-2 rounded-lg cursor-pointer shadow-xs"
        >
          {building ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          <span>{building ? 'Building…' : 'Build page index'}</span>
        </button>

        <span className="font-mono text-[10.5px] text-zinc-400">
          {sources.length === 0
            ? 'no sources stored'
            : `${sources.length} source${sources.length === 1 ? '' : 's'} stored`}
        </span>

        {error && (
          <span className="ml-auto text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            {error}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.25fr] gap-6 items-start">
        <SourceStager
          sources={sources}
          pending={pending}
          onAddFiles={handleAddFiles}
          onAddText={handleAddText}
          onRemove={requestRemove}
          rejected={rejected}
          busy={busy || deleting}
        />

        <PageIndexPreview index={index} stale={stale} />
      </div>

      {deleteTarget && (
        <ConfirmSourceDeleteModal
          source={deleteTarget}
          busy={deleting}
          error={deleteError}
          onCancel={() => {
            if (!deleting) {
              setDeleteTarget(null);
              setDeleteError('');
            }
          }}
          onConfirm={confirmRemove}
        />
      )}
    </div>
  );
};