'use client';

import React from 'react';
import { UserCheck } from 'lucide-react';

interface AvatarPreviewProps {
  voiceLabel: string;
}

export const AvatarPreview: React.FC<AvatarPreviewProps> = ({ voiceLabel }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden flex flex-col shadow-sm">
      <div className="h-72 sm:h-96 bg-[repeating-linear-gradient(135deg,oklch(0.94_0.006_250)_0_9px,oklch(0.965_0.004_250)_9px_18px)] dark:bg-[repeating-linear-gradient(135deg,oklch(0.18_0.006_250)_0_9px,oklch(0.22_0.004_250)_9px_18px)] flex items-end justify-center p-4 relative group">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <UserCheck className="w-28 h-28 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300 bg-white/90 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-700 rounded-lg p-2 text-center shadow-xs backdrop-blur-sm">
          full-body avatar still
          <br />
          1080 x 1920 · HeyGen render
        </div>
      </div>

      <div className="p-4 flex flex-col gap-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
        <div className="flex justify-between">
          <span className="text-zinc-500">Persona</span>
          <span className="font-semibold text-zinc-900 dark:text-white">
            Meera · retail host
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Framing</span>
          <span className="font-semibold text-zinc-900 dark:text-white">
            Full body, studio
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Voice</span>
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">
            {voiceLabel}
          </span>
        </div>
      </div>
    </div>
  );
};
