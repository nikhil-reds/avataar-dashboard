'use client';

import React from 'react';
import { ReviewRow } from '../../types';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface ReviewRowsProps {
  rows: ReviewRow[];
  verdicts: Record<number, 'approved' | 'rejected'>;
  fileName: string;
  pageNumber: number;
  onApprove: (idx: number) => void;
  onReject: (idx: number) => void;
}

export const ReviewRows: React.FC<ReviewRowsProps> = ({
  rows,
  verdicts,
  fileName,
  pageNumber,
  onApprove,
  onReject,
}) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-baseline gap-2 bg-zinc-50/50 dark:bg-zinc-800/30">
        <div className="text-sm font-semibold text-zinc-900 dark:text-white">
          Review extracted rows
        </div>
        <div className="font-mono text-xs text-zinc-400">
          {fileName} · p.{pageNumber}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {rows.map((row, idx) => {
          const verdict = verdicts[idx];
          const confNum = parseFloat(row.conf);
          const isLowConf = confNum < 0.7;

          let cardBorder = 'border-zinc-200 dark:border-zinc-800';
          let cardBg = 'bg-zinc-50/50 dark:bg-zinc-800/20';

          if (verdict === 'approved') {
            cardBorder = 'border-emerald-300 dark:border-emerald-800';
            cardBg = 'bg-emerald-50/30 dark:bg-emerald-950/20';
          } else if (verdict === 'rejected') {
            cardBorder = 'border-rose-300 dark:border-rose-800';
            cardBg = 'bg-rose-50/30 dark:bg-rose-950/20';
          } else if (isLowConf) {
            cardBorder = 'border-amber-300 dark:border-amber-800';
          }

          return (
            <div
              key={idx}
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
                {row.fields.map((f, fIdx) => (
                  <div
                    key={fIdx}
                    className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-lg p-2"
                  >
                    <div className="font-mono text-[9px] uppercase tracking-wider text-zinc-400">
                      {f.k}
                    </div>
                    <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 truncate">
                      {f.v}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => onApprove(idx)}
                  className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                    verdict === 'approved'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve</span>
                </button>

                <button
                  onClick={() => onReject(idx)}
                  className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                    verdict === 'rejected'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-rose-600 hover:text-white'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>

                <div className="ml-auto text-xs font-medium flex items-center gap-1">
                  {verdict === 'approved' && (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      ✓ queued for catalogue
                    </span>
                  )}
                  {verdict === 'rejected' && (
                    <span className="text-rose-600 dark:text-rose-400">
                      ✗ sent back to extractor
                    </span>
                  )}
                  {!verdict && isLowConf && (
                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      needs human review
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
