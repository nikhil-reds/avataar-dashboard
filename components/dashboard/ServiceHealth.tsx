'use client';

import React from 'react';
import { ServiceHealthItem } from '../../types';

interface ServiceHealthProps {
  services: ServiceHealthItem[];
}

export const ServiceHealth: React.FC<ServiceHealthProps> = ({ services }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-baseline bg-zinc-50/50 dark:bg-zinc-800/30">
        <div className="text-[14px] font-semibold text-zinc-900 dark:text-white">
          Service health
        </div>
        <div className="font-mono text-[11px] text-zinc-400">last 5 min</div>
      </div>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {services.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
              style={{ backgroundColor: item.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-medium text-zinc-900 dark:text-zinc-100">
                {item.name}
              </div>
              <div className="text-[11.5px] text-zinc-500">{item.note}</div>
            </div>
            <div className="font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {item.metric}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
