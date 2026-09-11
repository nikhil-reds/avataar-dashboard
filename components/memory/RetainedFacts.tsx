import React from 'react';
import { Sparkles } from 'lucide-react';
import type { ConversationDetail } from '../../lib/conversations';
import { formatStamp } from '../../lib/conversationQuery';

interface RetainedFactsProps {
  facts: ConversationDetail['facts'];
}

export const RetainedFacts: React.FC<RetainedFactsProps> = ({ facts }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col gap-3 shadow-sm">
      <div className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
        <Sparkles className="w-4 h-4 text-indigo-500" />
        <span>Retained facts</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
        {facts.map((fact) => (
          <div
            key={fact.id}
            className="border border-zinc-200/80 dark:border-zinc-800 rounded-lg p-3 flex flex-col gap-1 bg-zinc-50/50 dark:bg-zinc-800/30"
          >
            <div className="font-mono text-[9.5px] uppercase tracking-wider text-zinc-400 font-semibold">
              {fact.key}
            </div>
            <div className="text-xs font-semibold text-zinc-900 dark:text-white">
              {fact.value}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">
              {fact.expiresAt ? `expires ${formatStamp(fact.expiresAt)}` : 'no expiry set'}
            </div>
          </div>
        ))}

        {facts.length === 0 && (
          <div className="col-span-full text-xs text-zinc-400 p-2">
            No facts retained for this session. Fact extraction is not wired up yet, so
            this stays empty until something writes to it.
          </div>
        )}
      </div>
    </div>
  );
};
