'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface RenderComposerProps {
  voices: string[];
}

export const RenderComposer: React.FC<RenderComposerProps> = ({ voices }) => {
  const router = useRouter();
  const [script, setScript] = useState('');
  const [voice, setVoice] = useState(voices[0]);
  const [queueing, setQueueing] = useState(false);
  const [queued, setQueued] = useState(false);
  const [error, setError] = useState('');

  const handleQueue = async () => {
    if (queueing || !script.trim()) return;
    setQueueing(true);
    setQueued(false);
    setError('');

    try {
      const res = await fetch('/api/renders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, voice }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Could not queue the render');
        return;
      }
      setQueued(true);
      setScript('');
      router.refresh();
    } catch {
      setError('Could not reach the server');
    } finally {
      setQueueing(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col gap-3 shadow-sm">
      <div className="text-sm font-semibold text-zinc-900 dark:text-white">
        Compose a render
      </div>

      <textarea
        rows={4}
        value={script}
        onChange={(e) => {
          setScript(e.target.value);
          setQueued(false);
          setError('');
        }}
        placeholder="What should the avatar say?"
        className="text-xs p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-zinc-50/50 dark:bg-zinc-800/40 resize-y leading-relaxed"
      />

      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[9.5px] uppercase tracking-wider text-zinc-400 font-semibold">
            voice
          </span>
          <select
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            className="text-xs p-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50/50 dark:bg-zinc-800/40 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            {voices.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={handleQueue}
          disabled={queueing || !script.trim()}
          className="self-end flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all px-4 py-2 rounded-lg cursor-pointer shadow-xs"
        >
          {queueing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>{queueing ? 'Queueing...' : 'Queue render'}</span>
        </button>

        {error ? (
          <span className="self-end pb-2 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            {error}
          </span>
        ) : queued ? (
          <span className="self-end pb-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Queued
          </span>
        ) : null}
      </div>
    </div>
  );
};
