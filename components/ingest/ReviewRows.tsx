import React from 'react';
import { ReviewVerdict, type ExtractedRow, type IngestJob } from '@prisma/client';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface ReviewRowsProps {
  rows: ExtractedRow[];
  job: IngestJob | null;
}

/** `fields` is stored as JSON; render whatever key/value pairs the extractor wrote. */
function toPairs(fields: unknown): { k: string; v: string }[] {
  if (typeof fields !== 'object' || fields === null || Array.isArray(fields)) return [];
  return Object.entries(fields as Record<string, unknown>).map(([k, v]) => ({
    k,
    v: v === null || v === undefined ? '—' : String(v),
  }));
}

export const ReviewRows: React.FC<ReviewRowsProps> = ({ rows, job }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-baseline gap-2 bg-zinc-50/50 dark:bg-zinc-800/30">
        <div className="text-sm font-semibold text-zinc-900 dark:text-white">
          Review extracted rows
        </div>
        <div className="font-mono text-xs text-zinc-400 truncate">
          {job ? `${job.file} · p.${job.page}` : 'no job selected'}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {rows.map((row) => {
          const confidence = Number.parseFloat(row.conf);
          const isLowConf = Number.isFinite(confidence) && confidence < 0.7;

          let cardBorder = 'border-zinc-200 dark:border-zinc-800';
          let cardBg = 'bg-zinc-50/50 dark:bg-zinc-800/20';

          if (row.verdict === ReviewVerdict.APPROVED) {
            cardBorder = 'border-emerald-300 dark:border-emerald-800';
            cardBg = 'bg-emerald-50/30 dark:bg-emerald-950/20';
          } else if (row.verdict === ReviewVerdict.REJECTED) {
            cardBorder = 'border-rose-300 dark:border-rose-800';
            cardBg = 'bg-rose-50/30 dark:bg-rose-950/20';
          } else if (isLowConf) {
            cardBorder = 'border-amber-300 dark:border-amber-800';
          }

          return (
            <div
              key={row.id}
              className={`border rounded-xl p-3.5 flex flex-col gap-2.5 transition-all ${cardBorder} ${cardBg}`}
            >
              <div className="flex justify-between items-baseline gap-2">
                <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {row.name}
                </div>
                <div
                  className={`font-mono text-xs font-semibold ${
                    isLowConf
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  conf {row.conf}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {toPairs(row.fields).map((field) => (
                  <div
                    key={field.k}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-lg p-2"
                  >
                    <div className="font-mono text-[9px] uppercase tracking-wider text-zinc-400">
                      {field.k}
                    </div>
                    <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 truncate">
                      {field.v}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1 text-xs font-semibold">
                {row.verdict === ReviewVerdict.APPROVED && (
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                  </span>
                )}
                {row.verdict === ReviewVerdict.REJECTED && (
                  <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                    <XCircle className="w-3.5 h-3.5" /> Rejected
                  </span>
                )}
                {row.verdict === ReviewVerdict.PENDING && (
                  <span className="flex items-center gap-1.5 text-zinc-500">
                    <AlertCircle className="w-3.5 h-3.5" /> Awaiting review
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {rows.length === 0 && (
          <div className="py-8 text-center text-xs text-zinc-400">
            {job ? 'This job has no extracted rows.' : 'No ingest job selected.'}
          </div>
        )}
      </div>
    </div>
  );
};
