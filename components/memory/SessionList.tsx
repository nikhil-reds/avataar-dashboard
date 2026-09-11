'use client';

import React from 'react';
import { SessionItem } from '../../types';

interface SessionListProps {
  sessions: SessionItem[];
  selectedIdx: number;
  onSelectSession: (idx: number) => void;
  retentionHours: number;
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  selectedIdx,
  onSelectSession,
  retentionHours,
}) => {
  const getTtlColor = (session: SessionItem) => {
    if (session.ttl === 'expired') return 'text-rose-600 dark:text-rose-400';
    if (session.fresh) return 'text-emerald-600 dark:text-emerald-400';
    return 'text-zinc-400';
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-col gap-0.5 bg-zinc-50/50 dark:bg-zinc-800/30">
        <div className="text-sm font-semibold text-zinc-900 dark:text-white">
          Sessions in window
        </div>
        <div className="font-mono text-[10.5px] text-zinc-400">
          retention {retentionHours}h · then purged
        </div>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {sessions.map((session, idx) => {
          const isSelected = idx === selectedIdx;
          const ttlColor = getTtlColor(session);

          return (
            <div
              key={idx}
              onClick={() => onSelectSession(idx)}
              className={`p-3 cursor-pointer flex flex-col gap-1 transition-colors ${
                isSelected
                  ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-l-4 border-indigo-600 pl-2'
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
              }`}
            >
              <div className="flex justify-between items-baseline gap-2">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {session.name}
                </span>
                <span className={`font-mono text-[10.5px] font-medium ${ttlColor}`}>
                  {session.ttl}
                </span>
              </div>
              <div className="text-[11.5px] text-zinc-500 truncate">
                {session.summary}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
