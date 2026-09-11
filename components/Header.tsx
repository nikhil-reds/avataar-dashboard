'use client';


interface HeaderProps {
  status: 'idle' | 'live' | 'ended';
  timer: string;
}

const STATUS_CONFIG = {
  idle:  { label: 'Ready',  dot: 'bg-text-muted',       pill: 'text-text-muted border-border-subtle bg-surface-glass' },
  live:  { label: 'Live',   dot: 'bg-green animate-pulse-dot', pill: 'text-green border-green/25 bg-green/8' },
  ended: { label: 'Ended',  dot: 'bg-[#ef4444]',         pill: 'text-[#ef4444] border-[#ef4444]/20 bg-[#ef4444]/8' },
} as const;

export default function Header({ status, timer }: HeaderProps) {
  const cfg = STATUS_CONFIG[status];

  return (
    <header className="h-14 flex items-center justify-between px-5 bg-bg-secondary/80 backdrop-blur-xl border-b border-border-subtle shrink-0 z-20">

      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-xl bg-linear-to-br from-accent to-[#818cf8] flex items-center justify-center text-[11px] font-bold text-white shadow-[0_0_18px_rgba(99,102,241,0.35)]">
            RU
          </div>
        </div>
        <div className="leading-none">
          <div className="text-[14px] font-semibold text-text-primary tracking-tight">Rubenius</div>
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
