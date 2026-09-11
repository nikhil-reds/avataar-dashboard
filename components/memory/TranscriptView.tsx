import React from 'react';
import { SpeakerRole } from '@prisma/client';
import { formatStamp } from '../../lib/conversationQuery';
import type { ConversationDetail } from '../../lib/conversations';
import { ForgetSessionButton } from './ForgetSessionButton';

interface TranscriptViewProps {
  session: ConversationDetail | null;
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({ session }) => {
  if (!session) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 shadow-sm text-center text-xs text-zinc-400">
        Select a session to read its transcript.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col gap-4 shadow-sm">
      <div className="flex justify-between items-baseline gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
        <div className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
          {session.title ?? 'Untitled conversation'} · transcript
        </div>
        <ForgetSessionButton sessionId={session.id} />
      </div>

      <div className="flex flex-col gap-3">
        {session.turns.map((turn) => {
          const isShopper = turn.who === SpeakerRole.SHOPPER;
          const isSystem = turn.who === SpeakerRole.SYSTEM;

          return (
            <div
              key={turn.id}
              className={`flex gap-2 ${isShopper ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  isShopper
                    ? 'bg-zinc-900 text-white dark:bg-indigo-600'
                    : isSystem
                    ? 'bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-200'
                    : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100'
                }`}
              >
                <div className="font-mono text-[9.5px] tracking-wider uppercase opacity-60 mb-1">
                  {turn.who.toLowerCase()} · {formatStamp(turn.spokenAt)}
                </div>
                <div>{turn.text}</div>
              </div>
            </div>
          );
        })}

        {session.turns.length === 0 && (
          <div className="py-6 text-center text-xs text-zinc-400">
            No turns were recorded for this session.
          </div>
        )}
      </div>
    </div>
  );
};
