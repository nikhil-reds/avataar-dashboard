'use client';

import React from 'react';
import { LogRow, PipelineStep } from '../../types';
import { Layers } from 'lucide-react';

interface TraceDetailProps {
  log: LogRow;
}

export const TraceDetail: React.FC<TraceDetailProps> = ({ log }) => {
  const steps: PipelineStep[] = [
    { name: 'ASR / text in', ms: '80ms', color: '#10b981' },
    { name: 'Retrieval', ms: '41ms', color: '#10b981' },
    {
      name: log.model === 'gemini' ? 'Gemini reasoning' : 'Local LLM reasoning',
      ms: log.model === 'gemini' ? '1,410ms' : '820ms',
      color: log.model === 'gemini' ? '#f59e0b' : '#10b981',
    },
    { name: 'Memory write', ms: '12ms', color: '#10b981' },
    {
      name: 'HeyGen dispatch',
      ms: log.kind === 'render' ? '38s' : 'skipped',
      color: log.status === 'error' ? '#ef4444' : '#6b7280',
    },
  ];

  const metaFields = [
    { k: 'model', v: log.model },
    { k: 'latency', v: log.latency },
    { k: 'session', v: log.session },
    { k: 'status', v: log.status },
    { k: 'tokens', v: log.kind === 'chat' ? '318 in / 96 out' : '—' },
    {
      k: 'cost',
      v:
        log.model === 'gemini'
          ? '₹0.42'
          : log.model === 'heygen'
          ? '0.6 min'
          : '₹0.00',
    },
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-3 sticky top-20 shadow-sm">
      <div className="flex justify-between items-baseline gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
        <div className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-indigo-500" />
          <span>Trace detail</span>
        </div>
        <div className="font-mono text-xs text-zinc-400">{log.session}</div>
      </div>

      <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
        {log.event}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {metaFields.map((item, idx) => (
          <div
            key={idx}
            className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-2 border border-zinc-100 dark:border-zinc-800"
          >
            <div className="font-mono text-[9.5px] uppercase tracking-wider text-zinc-400">
              {item.k}
            </div>
            <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
              {item.v}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 flex flex-col gap-2">
        <div className="font-mono text-[9.5px] uppercase tracking-wider text-zinc-400">
          pipeline execution
        </div>
        <div className="flex flex-col gap-1.5">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: step.color }}
              />
              <span className="flex-1 text-zinc-700 dark:text-zinc-300">
                {step.name}
              </span>
              <span className="font-mono text-[11px] text-zinc-400">
                {step.ms}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
