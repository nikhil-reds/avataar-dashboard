'use client';

import React from 'react';
import { Send, Loader2, CheckCircle2 } from 'lucide-react';

interface ScriptComposerProps {
  script: string;
  onChangeScript: (value: string) => void;
  voice: string;
  onSelectVoice: (voice: string) => void;
  voices: string[];
  rendering: boolean;
  renderDone: boolean;
  onRender: () => void;
}

export const ScriptComposer: React.FC<ScriptComposerProps> = ({
  script,
  onChangeScript,
  voice,
  onSelectVoice,
  voices,
  rendering,
  renderDone,
  onRender,
}) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col gap-3 shadow-sm">
      <div className="text-sm font-semibold text-zinc-900 dark:text-white">
        Compose a render
      </div>

      <textarea
        rows={4}
        value={script}
        onChange={(e) => onChangeScript(e.target.value)}
        placeholder="Script for the avatar…"
        className="text-xs sm:text-sm p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-zinc-50/50 dark:bg-zinc-800/40 leading-relaxed resize-y"
      />

      <div className="flex gap-2 flex-wrap items-center">
        {voices.map((v) => {
          const isSelected = voice === v;
          return (
            <button
              key={v}
              onClick={() => onSelectVoice(v)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer transition-all ${
                isSelected
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {v}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-3">
        <button
          onClick={onRender}
          disabled={rendering}
          className={`flex items-center gap-2 text-xs font-semibold text-white px-4 py-2 rounded-lg cursor-pointer transition-all shadow-xs ${
            rendering
              ? 'bg-indigo-400 cursor-not-allowed'
              : renderDone
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {rendering ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : renderDone ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>
            {rendering
              ? 'Rendering…'
              : renderDone
              ? 'Queue another'
              : 'Send to HeyGen'}
          </span>
        </button>

        <div className="font-mono text-xs text-zinc-500">
          {renderDone
            ? 'done · 0:18 · 913 min left'
            : 'est. 38s · 913 of 1000 min left'}
        </div>
      </div>
    </div>
  );
};
