'use client';

import React from 'react';
import { AvatarRender } from '../../types';

interface RenderQueueProps {
  renders: AvatarRender[];
  creditNote: string;
}

export const RenderQueue: React.FC<RenderQueueProps> = ({
  renders,
  creditNote,
}) => {
  const getBadgeStyle = (state: AvatarRender['state']) => {
    switch (state) {
      case 'done':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
      case 'rendering':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 animate-pulse';
      case 'queued':
        return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
      case 'failed':
      default:
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300';
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-baseline bg-zinc-50/50 dark:bg-zinc-800/30">
        <div className="text-sm font-semibold text-zinc-900 dark:text-white">
          Render queue
        </div>
        <div className="font-mono text-xs text-zinc-400">{creditNote}</div>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {renders.map((item, idx) => (
          <div
            key={idx}
            className="grid grid-cols-[1fr_96px_84px_92px] gap-2 px-4 py-3 items-center text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
          >
            <div className="truncate font-medium text-zinc-900 dark:text-zinc-100 pr-2">
              {item.script}
            </div>
            <div className="text-zinc-500">{item.voice}</div>
            <div className="font-mono text-zinc-400">{item.length}</div>
            <div>
              <span
                className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full inline-block text-center capitalize w-full ${getBadgeStyle(
                  item.state
                )}`}
              >
                {item.state}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
