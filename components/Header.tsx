'use client';

import Image from 'next/image';
import type { AvatarPhase } from './AvatarPanel';

interface HeaderProps {
  status: AvatarPhase;
  timer: string;
}

const STATUS_CONFIG = {
  idle:       { label: 'Ready',      dot: 'bg-text-muted',              pill: 'text-text-muted border-border-subtle bg-surface-glass' },
  connecting: { label: 'Connecting', dot: 'bg-accent animate-pulse-dot', pill: 'text-accent border-accent/25 bg-accent/8' },
  live:       { label: 'Live',       dot: 'bg-green animate-pulse-dot', pill: 'text-green border-green/25 bg-green/8' },
  ended:      { label: 'Ended',      dot: 'bg-[#b91c1c]',               pill: 'text-[#b91c1c] border-[#b91c1c]/20 bg-[#b91c1c]/8' },
} as const;

export default function Header({ status, timer }: HeaderProps) {
  const cfg = STATUS_CONFIG[status];

  return (
    <header className="h-14 flex items-center justify-between px-5 bg-bg-secondary/80 backdrop-blur-xl border-b border-border-subtle shrink-0 z-20">

      {/* Brand — same mark as the screen saver, so the header does not contradict
          the logo the shopper is looking at. */}
      <div className="flex items-center gap-3">
        <Image
          src="/TR_mark.png"
          alt="Trifast Global"
          width={256}
          height={256}
          priority
          sizes="32px"
          className="w-8 h-8 shrink-0 rounded-lg object-contain"
        />
        <div className="leading-none">
          <div className="text-[14px] font-semibold text-text-primary tracking-tight">Trifast Global</div>
          <div className="hidden sm:block text-[11px] text-text-muted mt-0.5">AI Video Agent</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
  

        {/* Status pill */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium border transition-all duration-300 ${cfg.pill}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
          {cfg.label}
        </div>

        {/* Timer */}
        <div
          className={`font-mono text-[12px] font-medium px-2.5 py-1.5 rounded-full border transition-all duration-300 min-w-[58px] text-center tabular-nums
            ${status === 'live'
              ? 'text-green border-green/25 bg-green/8'
              : 'text-text-muted border-border-subtle bg-surface-glass'
            }`}
        >
          {timer}
        </div>
      </div>
    </header>
  );
}
