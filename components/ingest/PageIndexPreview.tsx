'use client';

import React, { useState } from 'react';
import {
  Code2,
  ListTree,
  Copy,
  Check,
  Download,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import type { PageIndexDoc, PageIndexDocument } from '../../types';

interface PageIndexPreviewProps {
  /** The stored build being shown, or null before one has been built. */
  index: PageIndexDoc | null;
  /** True when the stored sources no longer match what this index was built over. */
  stale: boolean;
}

type PreviewView = 'tree' | 'json';

const VIEW_BASE =
  'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer';

function statusChip(doc: PageIndexDocument) {
  if (doc.status === 'indexed') {
    return (
      <span className="font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
        indexed
      </span>
    );
  }
  if (doc.status === 'error') {
    return (
      <span className="font-mono text-[10px] font-semibold text-rose-600 dark:text-rose-400">
        error
      </span>
    );
  }
  return (
    <span className="font-mono text-[10px] font-semibold text-amber-600 dark:text-amber-400">
      pending extraction
    </span>
  );
}

const DocumentNode: React.FC<{ doc: PageIndexDocument }> = ({ doc }) => {
  const [open, setOpen] = useState(true);
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-zinc-50/60 dark:bg-zinc-800/30 text-left cursor-pointer"
      >
        <Chevron className="w-3.5 h-3.5 text-zinc-400 shrink-0" />

        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate flex-1">
          {doc.title}
        </span>

        {statusChip(doc)}
      </button>

      {open && (
        <div className="p-3 flex flex-col gap-2">
          <div className="font-mono text-[10.5px] text-zinc-400">
            {doc.id} · {doc.mime}
            {doc.stats
              ? ` · ${doc.stats.sections} sections · ${doc.stats.words} words`
              : ''}
          </div>

          {doc.note && (
            <div className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />
              <span>{doc.note}</span>
            </div>
          )}

          {doc.nodes.map((node) => (
            <div
              key={node.id}
              style={{ marginLeft: `${(node.depth - 1) * 12}px` }}
              className="border-l-2 border-indigo-200 dark:border-indigo-900 pl-3 py-1"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                  {node.heading}
                </span>
                <span className="font-mono text-[10px] text-zinc-400 shrink-0">
                  {node.words}w · {node.start}–{node.end}
                </span>
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                {node.preview}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const PageIndexPreview: React.FC<PageIndexPreviewProps> = ({ index, stale }) => {
  const [view, setView] = useState<PreviewView>('tree');
  const [copied, setCopied] = useState(false);

  const json = index ? JSON.stringify(index, null, 2) : '';

  const handleCopy = async () => {
    if (!json) return;
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const handleDownload = () => {
    if (!json) return;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'page-index.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    // Fixed height with the body scrolling inside: an index of twenty documents would
    // otherwise run past the staging column and push the queue below the fold.
    <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex flex-col shadow-sm overflow-hidden h-[26rem] sm:h-[32rem] xl:h-[40rem]">
      <div className="shrink-0 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
          <Code2 className="w-4 h-4 text-indigo-500" />
          <span>Page index</span>
        </div>

        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setView('tree')}
            className={`${VIEW_BASE} ${
              view === 'tree'
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <ListTree className="w-3.5 h-3.5" />
            <span>Tree</span>
          </button>

          <button
            type="button"
            onClick={() => setView('json')}
            className={`${VIEW_BASE} ${
              view === 'json'
                ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {!index ? (
          <div className="flex-1 flex items-center justify-center px-4 text-center text-xs text-zinc-400">
            Add a file or some text, then build the index.
          </div>
        ) : (
          <>
            {/* Banner and actions stay put; only the index itself scrolls. */}
            <div className="shrink-0 px-4 pt-4 flex flex-col gap-3">
              {stale && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                  Sources changed since this index was built. Build it again.
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>

                <span className="font-mono text-[10.5px] text-zinc-400 ml-auto truncate">
                  v{index.version} · {index.documents.length} docs
                  {index.buildId ? ` · build ${index.buildId.slice(0, 8)}` : ''}
                </span>
              </div>
            </div>

            {/* `overflow-y-scroll` rather than `auto`: the gutter is always reserved, so
                the tree does not reflow by a scrollbar's width as documents expand. */}
            <div className="flex-1 min-h-0 overflow-y-scroll panel-scroll px-4 py-3">
              {view === 'tree' ? (
                <div className="flex flex-col gap-2">
                  {index.documents.map((doc) => (
                    <DocumentNode key={doc.id} doc={doc} />
                  ))}
                </div>
              ) : (
                // Vertical scrolling belongs to the container; the block keeps its own
                // horizontal scroll so long lines are not wrapped mid-token.
                <pre className="font-mono text-[11.5px] leading-relaxed text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 rounded-lg p-3 overflow-x-auto">
                  {json}
                </pre>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
