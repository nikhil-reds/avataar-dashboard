'use client';

import React from 'react';
import { LogRow } from '../../types';

interface LogTableProps {
  logs: LogRow[];
  selectedIndex: number;
  onSelectRow: (index: number) => void;
}

export const LogTable: React.FC<LogTableProps> = ({
  logs,
  selectedIndex,
  onSelectRow,
}) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <div className="grid grid-cols-[88px_1fr_82px_70px] gap-2 px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 font-mono text-[10px] font-bold tracking-wider uppercase text-zinc-400">
        <div>time</div>
        <div>event</div>
        <div>model</div>
        <div>latency</div>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {logs.map((row, idx) => {
          const isSelected = idx === selectedIndex;
          let statusColor = 'text-zinc-500';
          if (row.status === 'error') statusColor = 'text-rose-500 font-semibold';
          else if (row.status === 'escalated') statusColor = 'text-amber-600 font-semibold';

          return (
            <div
              key={idx}
              onClick={() => onSelectRow(idx)}
              className={`grid grid-cols-[88px_1fr_82px_70px] gap-2 px-3 py-3 cursor-pointer items-center transition-colors text-xs ${
                isSelected
                  ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-l-4 border-indigo-600 pl-2'
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
              }`}
            >
              <div className="font-mono text-zinc-500 text-[11.5px]">{row.time}</div>
              <div className="min-w-0 pr-2">
                <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {row.event}
                </div>
                <div className={`text-[11px] ${statusColor}`}>
                  {row.status} · {row.session}
                </div>
              </div>
              <div className="font-mono text-zinc-600 dark:text-zinc-400 text-[11.5px]">
                {row.model}
              </div>
              <div className="font-mono text-zinc-600 dark:text-zinc-400 text-[11.5px]">
                {row.latency}
              </div>
            </div>
          );
        })}
        {logs.length === 0 && (
          <div className="p-8 text-center text-xs text-zinc-400">
            No log entries match the selected filter query.
          </div>
        )}
      </div>
    </div>
  );
};
