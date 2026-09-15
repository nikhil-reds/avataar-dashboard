import React from 'react';
import { MessageSquare } from 'lucide-react';
import { formatDuration, formatStamp } from '@/lib/conversationQuery';
import { groupIntoExchanges, type ConversationDetail } from '@/lib/conversations';

interface TranscriptPanelProps {
  session: ConversationDetail | null;
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({ session }) => {
  if (!session) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-8 flex flex-col items-center justify-center gap-2 text-center">
        <MessageSquare className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
        <div className="text-xs text-zinc-400">
          Select a conversation to read its transcript.
        </div>
      </div>
    );
  }

  const exchanges = groupIntoExchanges(session.turns);

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex flex-col gap-1 bg-zinc-50/50 dark:bg-zinc-800/30">
        <div className="text-sm font-semibold text-zinc-900 dark:text-white">
          {session.title ?? 'Untitled conversation'}
        </div>
        <div className="font-mono text-[10.5px] text-zinc-400 flex flex-wrap gap-x-3 gap-y-0.5">
          <span>{formatStamp(session.startedAt)}</span>
          <span>{session.turnCount} turns</span>
          <span>{formatDuration(session.durationSec)}</span>
          <span className="truncate">{session.id}</span>
        </div>
        {session.avatarSessionId && (
          <div className="font-mono text-[10px] text-zinc-400 truncate">
            heygen · {session.avatarSessionId}
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-4 max-h-[60vh] xl:max-h-[560px] overflow-y-auto">
        {exchanges.map((exchange, idx) => (
          <div key={exchange.question?.id ?? 'unprompted-' + idx} className="flex flex-col gap-2">
            {exchange.question && (
              <div className="flex flex-col gap-1 self-end items-end max-w-[85%]">
                <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                  shopper · {formatStamp(exchange.question.spokenAt)}
                </div>
                <div className="text-[13px] leading-relaxed rounded-xl rounded-br-sm px-3 py-2 bg-indigo-600 text-white">
                  {exchange.question.text}
                </div>
              </div>
            )}

            {exchange.answers.map((answer) => (
              <div key={answer.id} className="flex flex-col gap-1 self-start max-w-[85%]">
                <div className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                  {answer.who.toLowerCase()} · {formatStamp(answer.spokenAt)}
                </div>
                <div className="text-[13px] leading-relaxed rounded-xl rounded-bl-sm px-3 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100">
                  {answer.text}
                </div>
              </div>
            ))}

            {exchange.question && exchange.answers.length === 0 && (
              <div className="self-start text-[11.5px] italic text-amber-600 dark:text-amber-400">
                No answer recorded for this question.
              </div>
            )}
          </div>
        ))}

        {exchanges.length === 0 && (
          <div className="py-8 text-center text-xs text-zinc-400">
            This session has no recorded turns.
          </div>
        )}
      </div>
    </div>
  );
};
