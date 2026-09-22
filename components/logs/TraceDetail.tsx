import React from 'react';
import { Layers } from 'lucide-react';
import type { ActivityRecord } from '../../lib/activity';
import { formatStamp } from '../../lib/conversationQuery';

interface TraceDetailProps {
  record: ActivityRecord | null;
}

export const TraceDetail: React.FC<TraceDetailProps> = ({ record }) => {
  if (!record) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-8 flex flex-col items-center justify-center gap-2 text-center">
        <Layers className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
        <div className="text-xs text-zinc-400">
          Select an event to inspect what was recorded for it.
        </div>
      </div>
    );
  }

  // Only fields that were actually measured are shown. A blank here means the value was
  // never captured for this kind of event, which is more useful than a filled-in guess.
  const fields: { k: string; v: string }[] = [
    { k: 'recorded', v: formatStamp(record.createdAt) },
    { k: 'kind', v: record.kind.toLowerCase() },
    { k: 'status', v: record.status.toLowerCase() },
    { k: 'source', v: record.model ?? '—' },
    { k: 'latency', v: record.latencyMs === null ? '—' : record.latencyMs + 'ms' },
    {
      k: 'tokens',
      v:
        record.tokensIn === null && record.tokensOut === null
          ? '—'
          : `${record.tokensIn ?? 0} in / ${record.tokensOut ?? 0} out`,
    },
    { k: 'cost', v: record.cost === null ? '—' : String(record.cost) },
    { k: 'session', v: record.sessionId ?? '—' },
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center gap-2">
        <Layers className="w-4 h-4 text-indigo-500" />
        <div className="text-sm font-semibold text-zinc-900 dark:text-white">
          Event detail
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        <div className="text-[13px] leading-relaxed text-zinc-900 dark:text-zinc-100">
          {record.event}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {fields.map((field) => (
            <div
              key={field.k}
              className="border border-zinc-200/80 dark:border-zinc-800 rounded-lg p-2.5 flex flex-col gap-0.5 bg-zinc-50/50 dark:bg-zinc-800/30 min-w-0"
            >
              <div className="font-mono text-[9.5px] uppercase tracking-wider text-zinc-400 font-semibold">
                {field.k}
              </div>
              <div className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                {field.v}
              </div>
            </div>
          ))}
        </div>

        {record.detail && (
          <div className="flex flex-col gap-1.5">
            <div className="font-mono text-[9.5px] uppercase tracking-wider text-zinc-400 font-semibold">
              detail
            </div>
            <div className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 rounded-lg p-3 whitespace-pre-wrap break-words">
              {record.detail}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
