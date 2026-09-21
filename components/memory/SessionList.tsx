import React from 'react';
import Link from 'next/link';
import { SessionStatus } from '@/app/generated/prisma';
import { formatStamp } from '../../lib/conversationQuery';
import { TAB_BY_ID } from '@/data/navigation';

export interface SessionListItem {
  id: string;
  title: string | null;
  summary: string | null;
  status: SessionStatus;
  startedAt: Date;
  turnCount: number;
  expiresAt: Date | null;
}

interface SessionListProps {
  sessions: SessionListItem[];
  selectedId: string | null;
}

/** Retention wording reflects the stored expiry, or says so when none is set. */
function retentionLabel(session: SessionListItem): { text: string; color: string } {
  if (session.status === SessionStatus.LIVE) {
    return { text: 'live', color: 'text-emerald-600 dark:text-emerald-400' };
  }
  if (!session.expiresAt) {
    return { text: 'kept', color: 'text-zinc-400' };
  }
  const remainingMs = session.expiresAt.getTime() - Date.now();
  if (remainingMs <= 0) return { text: 'expired', color: 'text-rose-600 dark:text-rose-400' };
  const hours = Math.round(remainingMs / (60 * 60 * 1000));
  return { text: `${hours}h left`, color: 'text-zinc-400' };
}

export const SessionList: React.FC<SessionListProps> = ({ sessions, selectedId }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-col gap-0.5 bg-zinc-50/50 dark:bg-zinc-800/30">
        <div className="text-sm font-semibold text-zinc-900 dark:text-white">
          Recorded sessions
        </div>
        <div className="font-mono text-[10.5px] text-zinc-400">
          {sessions.length} most recent
        </div>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {sessions.map((session) => {
          const isSelected = session.id === selectedId;
          const retention = retentionLabel(session);

          return (
            <Link
              key={session.id}
              href={`${TAB_BY_ID.memory.href}?selected=${session.id}`}
              scroll={false}
              className={`p-3 flex flex-col gap-1 transition-colors ${
                isSelected
                  ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-l-4 border-indigo-600 pl-2'
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
              }`}
            >
              <div className="flex justify-between items-baseline gap-2">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {session.title ?? 'Untitled conversation'}
                </span>
                <span className={`font-mono text-[10.5px] font-medium shrink-0 ${retention.color}`}>
                  {retention.text}
                </span>
              </div>
              <div className="text-[11.5px] text-zinc-500 truncate">
                {session.summary ?? `${session.turnCount} turns · ${formatStamp(session.startedAt)}`}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
