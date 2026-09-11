'use client';

import React from 'react';
import { LatencyItem } from '../../types';

interface LatencyRouteProps {
  latencyItems: LatencyItem[];
}

export const LatencyRoute: React.FC<LatencyRouteProps> = ({ latencyItems }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
      <div>
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-baseline bg-zinc-50/50 dark:bg-zinc-800/30">
          <div className="text-[14px] font-semibold text-zinc-900 dark:text-white">
            Latency by route
          </div>
          <div className="font-mono text-[11px] text-zinc-400">p50 / p95 ms</div>
        </div>
        <div className="p-4 flex flex-col gap-4">
          {latencyItems.map((item, idx) => (
            <div key={idx} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {item.name}
                </span>
                <span className="font-mono text-zinc-500">{item.readout}</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: item.pct,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="text-xs text-zinc-500 border-t border-zinc-100 dark:border-zinc-800 p-4 bg-zinc-50/30 dark:bg-zinc-900/30">
        Local model answers 78% of turns; catalogue-grounded reasoning still routes to Gemini when confidence &lt; 0.6.
      </div>
    </div>
  );
};
