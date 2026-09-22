import React from 'react';
import { RenderState, type AvatarRender } from '@/app/generated/prisma';
import { formatStamp } from '../../lib/conversationQuery';

interface RenderQueueProps {
  renders: AvatarRender[];
}

// Below `md` the row renders as a stacked card instead; these tracks apply at `md`+.
const GRID = 'grid grid-cols-[1fr_120px_84px_92px] gap-2';

function badgeStyle(state: RenderState): string {
  switch (state) {
    case RenderState.DONE:
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
    case RenderState.RENDERING:
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 animate-pulse';
    case RenderState.QUEUED:
      return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
    default:
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300';
  }
}

function duration(seconds: number | null): string {
  if (seconds === null) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export const RenderQueue: React.FC<RenderQueueProps> = ({ renders }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-baseline bg-zinc-50/50 dark:bg-zinc-800/30">
        <div className="text-sm font-semibold text-zinc-900 dark:text-white">
          Render queue
        </div>
        <div className="font-mono text-xs text-zinc-400">
          {renders.length} {renders.length === 1 ? 'request' : 'requests'}
        </div>
      </div>

      <div
        className={`hidden md:grid ${GRID} px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 font-mono text-[10px] font-bold tracking-wider uppercase text-zinc-400`}
      >
        <div>script</div>
        <div>voice</div>
        <div>length</div>
        <div>state</div>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {renders.map((item) => {
          const badge = (
            <span
              className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full inline-block text-center capitalize ${badgeStyle(
                item.state
              )}`}
            >
              {item.state.toLowerCase()}
            </span>
          );

          return (
            <div
              key={item.id}
              className="text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
            >
              {/* Phone: script text is the only thing worth full width; voice, length
                  and time collapse to a meta line. */}
              <div className="md:hidden flex flex-col gap-1 px-4 py-3">
                <div className="flex justify-between items-start gap-2">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100 min-w-0 line-clamp-2">
                    {item.script}
                  </span>
                  <span className="shrink-0">{badge}</span>
                </div>
                <div className="font-mono text-[11px] text-zinc-400 flex flex-wrap gap-x-1.5">
                  <span className="truncate">{item.voice}</span>
                  <span className="text-zinc-300 dark:text-zinc-600">·</span>
                  <span>{duration(item.durationSec)}</span>
                  <span className="text-zinc-300 dark:text-zinc-600">·</span>
                  <span>{formatStamp(item.createdAt)}</span>
                </div>
              </div>

              <div className={`hidden md:grid ${GRID} px-4 py-3 items-center`}>
                <div className="min-w-0 pr-2">
                  <div className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                    {item.script}
                  </div>
                  <div className="font-mono text-[10.5px] text-zinc-400">
                    {formatStamp(item.createdAt)}
                  </div>
                </div>
                <div className="text-zinc-500 truncate">{item.voice}</div>
                <div className="font-mono text-zinc-400">{duration(item.durationSec)}</div>
                <div>{badge}</div>
              </div>
            </div>
          );
        })}

        {renders.length === 0 && (
          <div className="p-8 text-center text-xs text-zinc-400">
            No renders requested yet.
          </div>
        )}
      </div>
    </div>
  );
};
