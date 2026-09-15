'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { NavTab } from '../../types';
import { Clock, Sparkles } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  activeTabDef: NavTab;
  /** Click handler for the CTA. Client pages only — a server page passes `ctaHref`. */
  onPrimaryClick?: () => void;
  /** Navigation target for the CTA, for pages rendered on the server. */
  ctaHref?: string;
}

const CTA_CLASS =
  'flex items-center gap-2 text-[13px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all px-4 py-2 rounded-lg shadow-sm cursor-pointer';

export const Header: React.FC<HeaderProps> = ({
  activeTabDef,
  onPrimaryClick,
  ctaHref,
}) => {
  // Empty until mounted: rendering a fixed placeholder time would show a stale clock
  // for a frame, and would not match the server output.
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const day = now.getDate();
      const month = now.toLocaleString('en-US', { month: 'short' });
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setTimeStr(`${day} ${month} · ${hours}:${mins} IST`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex items-end justify-between gap-6 flex-wrap px-8 py-5 border-b border-zinc-200/80 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 sticky top-0 z-10 backdrop-blur-md">
      <div className="flex flex-col gap-1 min-w-0">

        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          {activeTabDef.title}
        </h1>
        <p className="text-[13.5px] text-zinc-500 dark:text-zinc-400 max-w-2xl">
          {activeTabDef.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {timeStr && (
          <div className="font-mono text-[11px] text-zinc-600 dark:text-zinc-300 px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>{timeStr}</span>
          </div>
        )}

        <ThemeToggle />

        {ctaHref ? (
          <Link href={ctaHref} className={CTA_CLASS}>
            <Sparkles className="w-4 h-4" />
            <span>{activeTabDef.cta}</span>
          </Link>
        ) : onPrimaryClick ? (
          <button onClick={onPrimaryClick} className={CTA_CLASS}>
            <Sparkles className="w-4 h-4" />
            <span>{activeTabDef.cta}</span>
          </button>
        ) : null}
      </div>
    </header>
  );
};
