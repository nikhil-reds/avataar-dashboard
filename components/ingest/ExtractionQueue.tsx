'use client';

import React from 'react';
import { IngestJob } from '../../types';

interface ExtractionQueueProps {
  jobs: IngestJob[];
  selectedJobIdx: number;
  onSelectJob: (idx: number) => void;
}

export const ExtractionQueue: React.FC<ExtractionQueueProps> = ({
  jobs,
  selectedJobIdx,
  onSelectJob,
}) => {
  const getJobColor = (state: IngestJob['state']) => {
    switch (state) {
      case 'done':
        return '#10b981';
      case 'extracting':
        return '#4f46e5';
      case 'queued':
        return '#6b7280';
      case 'failed':
        return '#ef4444';
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-900 dark:text-white bg-zinc-50/50 dark:bg-zinc-800/30">
        Extraction queue
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {jobs.map((job, idx) => {
          const isSelected = idx === selectedJobIdx;
          const color = getJobColor(job.state);

          return (
            <div
              key={idx}
              onClick={() => onSelectJob(idx)}
              className={`p-3 cursor-pointer flex flex-col gap-2 transition-colors ${
                isSelected
                  ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-l-4 border-indigo-600 pl-2'
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
              }`}
            >
              <div className="flex justify-between items-baseline gap-2">
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {job.file}
                </div>
                <div
                  className="font-mono text-[11px] font-semibold capitalize"
                  style={{ color }}
                >
                  {job.state}
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: job.pct, backgroundColor: color }}
                />
              </div>
              <div className="text-[11.5px] text-zinc-500">{job.note}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
