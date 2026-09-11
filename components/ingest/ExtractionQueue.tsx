import React from 'react';
import Link from 'next/link';
import { IngestJobState, type IngestJob } from '@prisma/client';

interface ExtractionQueueProps {
  jobs: IngestJob[];
  selectedJobId: string | null;
}

function stateColor(state: IngestJobState): string {
  switch (state) {
    case IngestJobState.DONE:
      return '#10b981';
    case IngestJobState.EXTRACTING:
      return '#4f46e5';
    case IngestJobState.FAILED:
      return '#ef4444';
    default:
      return '#6b7280';
  }
}

export const ExtractionQueue: React.FC<ExtractionQueueProps> = ({ jobs, selectedJobId }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-900 dark:text-white bg-zinc-50/50 dark:bg-zinc-800/30">
        Extraction queue
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {jobs.map((job) => {
          const isSelected = job.id === selectedJobId;
          const color = stateColor(job.state);

          return (
            <Link
              key={job.id}
              href={`/ingest?job=${job.id}`}
              scroll={false}
              className={`flex flex-col gap-1.5 px-4 py-3 transition-colors ${
                isSelected
                  ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-l-4 border-indigo-600 pl-3'
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
              }`}
            >
              <div className="flex justify-between items-baseline gap-2">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {job.file}
                </span>
                <span
                  className="font-mono text-[10.5px] font-semibold shrink-0 capitalize"
                  style={{ color }}
                >
                  {job.state.toLowerCase()}
                </span>
              </div>

              <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${job.pct}%`, backgroundColor: color }}
                />
              </div>

              <div className="font-mono text-[10.5px] text-zinc-400">
                {job.pct}%{job.totalPages ? ` · page ${job.page} of ${job.totalPages}` : ''}
                {job.note ? ` · ${job.note}` : ''}
              </div>
            </Link>
          );
        })}

        {jobs.length === 0 && (
          <div className="p-8 text-center text-xs text-zinc-400">
            No ingest jobs recorded.
          </div>
        )}
      </div>
    </div>
  );
};
