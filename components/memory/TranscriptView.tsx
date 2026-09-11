'use client';

import React from 'react';
import { SessionItem } from '../../types';
import { Trash2, Check } from 'lucide-react';

interface TranscriptViewProps {
  session: SessionItem;
  forgotten: boolean;
  onForget: () => void;
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({
  session,
  forgotten,
  onForget,
}) => {
  const turns = forgotten
    ? [
        {
          who: 'system' as const,
          text: 'Memory for this session was cleared manually. The avatar will start fresh on the next turn.',
          time: 'now',
        },
      ]
    : session.turns;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col gap-4 shadow-sm">
      <div className="flex justify-between items-baseline gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
        <div className="text-sm font-semibold text-zinc-900 dark:text-white">
          {session.name} · transcript
        </div>
        <button
          onClick={onForget}
          disabled={forgotten}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            forgotten
              ? 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 cursor-not-allowed'
              : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 hover:bg-rose-600 hover:text-white'
          }`}
        >
          {forgotten ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Cleared</span>
            </>
          ) : (
            <>
              <Trash2 className="w-3.5 h-3.5" />
              <span>Forget this session</span>
            </>
          )}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {turns.map((tn, idx) => {
          const isShopper = tn.who === 'shopper';
          const isSystem = tn.who === 'system';

          return (
            <div
              key={idx}
              className={`flex gap-2 ${
                isShopper ? 'justify-end' : 'justify-start'
              }`}
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
                  {tn.who} · {tn.time}
                </div>
                <div>{tn.text}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
