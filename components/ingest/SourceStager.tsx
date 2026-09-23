'use client';

import React, { useRef, useState } from 'react';
import {
  FileText,
  FileType2,
  FileSpreadsheet,
  Trash2,
  Upload,
  Type,
  Plus,
  AlertCircle,
  Download,
  Loader2,
} from 'lucide-react';
import type { IngestSourceRow, PendingUpload } from '../../types';
import { ACCEPT_ATTRIBUTE, formatBytes, SUPPORTED_EXTENSIONS } from '../../lib/pageIndex';

interface SourceStagerProps {
  sources: IngestSourceRow[];
  /** Uploads still in flight, rendered above the stored rows. */
  pending: PendingUpload[];
  onAddFiles: (files: File[]) => void;
  onAddText: (title: string, body: string) => void;
  onRemove: (id: string) => void;
  /** Files the browser or the server refused, as readable sentences. */
  rejected: string[];
  busy: boolean;
}

type StagerTab = 'upload' | 'text';

function iconFor(source: IngestSourceRow) {
  if (source.kind === 'TEXT') return Type;
  if (source.ext === 'xlsx' || source.ext === 'csv') return FileSpreadsheet;
  if (source.ext === 'pdf') return FileType2;
  return FileText;
}

function badgeFor(source: IngestSourceRow): string {
  if (source.kind === 'TEXT') return 'Pasted';
  return SUPPORTED_EXTENSIONS[source.ext]?.label ?? source.ext.toUpperCase();
}

const TAB_BASE =
  'flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all cursor-pointer';

export const SourceStager: React.FC<SourceStagerProps> = ({
  sources,
  pending,
  onAddFiles,
  onAddText,
  onRemove,
  rejected,
  busy,
}) => {
  const [tab, setTab] = useState<StagerTab>('upload');
  const [dragging, setDragging] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length) onAddFiles(files);
  };

  const handlePicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length) onAddFiles(files);
    // Clear the input so re-picking the same file fires `change` again.
    event.target.value = '';
  };

  const handleAddText = () => {
    if (!body.trim()) return;
    onAddText(title.trim() || 'Untitled note', body);
    setTitle('');
    setBody('');
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col shadow-sm">
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm font-semibold text-zinc-900 dark:text-white">
          Add sources
        </div>

        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setTab('upload')}
            className={`${TAB_BASE} ${
              tab === 'upload'
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload files</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('text')}
            className={`${TAB_BASE} ${
              tab === 'text'
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Paste text</span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-5 flex flex-col gap-4">
        {tab === 'upload' ? (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`rounded-xl border-2 border-dashed transition-colors ${
              dragging
                ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30'
                : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/20'
            }`}
          >
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-full flex flex-col items-center gap-2 px-4 py-8 sm:py-10 cursor-pointer text-center"
            >
              <span className="w-11 h-11 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
                <Upload className="w-5 h-5 text-indigo-500" />
              </span>
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                Drop files here, or browse
              </span>
              <span className="text-xs text-zinc-500 max-w-sm">
                PDF, DOC, DOCX, RTF, XLSX, TXT, MD and CSV, up to 25 MB each.
              </span>
            </button>

            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT_ATTRIBUTE}
/* progress step 2 */
              type="file"
              multiple
              accept={ACCEPT_ATTRIBUTE}
              onChange={handlePicked}
              className="hidden"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[9.5px] uppercase tracking-wider text-zinc-400 font-semibold">
                title
              </span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Kada talking points"
                className="text-xs p-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-zinc-50/50 dark:bg-zinc-800/40"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-mono text-[9.5px] uppercase tracking-wider text-zinc-400 font-semibold">
                content
              </span>
              <textarea
                rows={9}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={
                  'Paste supplier notes, product copy or an email thread.\n\nBlank lines separate sections, and a short opening line becomes that section’s heading.'
                }
                className="text-xs p-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-zinc-50/50 dark:bg-zinc-800/40 resize-y leading-relaxed"
              />
            </label>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleAddText}
                disabled={!body.trim() || busy}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all px-4 py-2 rounded-lg cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add as source</span>
              </button>

              <span className="font-mono text-[10.5px] text-zinc-400">
                {body.trim() ? `${body.length} chars` : 'nothing to add yet'}
              </span>
            </div>
          </div>
        )}

        {rejected.length > 0 && (
          <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-3 py-2.5 flex flex-col gap-1">
            {rejected.map((reason) => (
              <div
                key={reason}
                className="text-xs text-rose-700 dark:text-rose-300 flex items-start gap-1.5"
              >
                <AlertCircle className="w-3.5 h-3.5 mt-px shrink-0" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div
            className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-400 font-semibold"
            aria-live="polite"
          >
            stored · {sources.length}
            {pending.length > 0 ? ` · ${pending.length} uploading` : ''}
          </div>

          {sources.length === 0 && pending.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
              Nothing stored yet.
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {pending.map((upload) => (
                <li
                  key={upload.tempId}
                  className="flex items-center gap-3 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 bg-zinc-50/50 dark:bg-zinc-800/20 opacity-70"
                >
                  <Loader2 className="w-4 h-4 text-indigo-500 shrink-0 animate-spin" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {upload.name}
                    </span>
                    <span className="font-mono text-[10.5px] text-zinc-400">
                      uploading · {formatBytes(upload.sizeBytes)}
                    </span>
                  </div>
                </li>
              ))}

              {sources.map((source) => {
                const Icon = iconFor(source);
                const pendingExtraction = source.status === 'PENDING_EXTRACTION';

                return (
                  <li
                    key={source.id}
                    className="flex items-center gap-3 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2.5 bg-zinc-50/50 dark:bg-zinc-800/20"
                  >
                    <Icon className="w-4 h-4 text-indigo-500 shrink-0" />

                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {source.title}
                      </span>
                      <span className="font-mono text-[10.5px] text-zinc-400">
                        {badgeFor(source)} · {formatBytes(source.sizeBytes)}
                        {pendingExtraction ? ' · metadata only' : ''}
                        {source.status === 'INDEXED' ? ' · indexed' : ''}
                      </span>
                    </div>

                    {source.hasFile && (
                      <a
                        href={`/api/ingest/sources/${source.id}/file`}
                        aria-label={`Download ${source.title}`}
                        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => onRemove(source.id)}
                      disabled={busy}
                      aria-label={`Remove ${source.title}`}
                      className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};