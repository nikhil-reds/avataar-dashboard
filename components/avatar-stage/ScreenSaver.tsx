import Image from 'next/image';

/**
 * Idle state for the avatar stage — a branded screen saver.
 *
 * The ground is `--color-bg-secondary`, which is the exact off-white of
 * TR_logo.png, so the image's own background dissolves into the page instead of
 * showing as a rectangle on a differently coloured surface.
 *
 * Everything here is decorative: the only control on the stage is the connect
 * button, which the panel anchors to the bottom-right corner.
 */
export function ScreenSaver() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-bg-secondary">
      {/* Two offset washes on a long, out-of-phase loop, so the screen keeps
          moving gently without ever repeating an obvious cycle. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-1/4 -top-1/5 h-[70%] w-[70%] rounded-full blur-3xl animate-drift
                   bg-[radial-gradient(circle,rgba(11,34,101,0.11)_0%,transparent_65%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-1/4 -bottom-1/5 h-[75%] w-[75%] rounded-full blur-3xl animate-drift [animation-delay:-11s]
                   bg-[radial-gradient(circle,rgba(11,34,101,0.08)_0%,transparent_65%)]"
      />

      <div className="relative h-full flex flex-col items-center justify-center gap-6 sm:gap-9 px-8 text-center">
        <div className="relative animate-breathe">
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[135%] aspect-square -translate-x-1/2 -translate-y-1/2
                       rounded-full border border-dashed border-accent/15 animate-spin-slow"
          />
          {/* TR_logo_alpha.png is TR_logo.png with its cream ground turned into an
              alpha channel, so the artwork sits directly on the drifting wash with
              no visible tile. The shadow follows the letterforms for the same
              reason — on the original opaque PNG it traced the image rectangle. */}
          <Image
            src="/TR_logo_alpha.png"
            alt="Trifast Global"
            width={2106}
            height={2016}
            priority
            sizes="(max-width: 640px) 240px, 340px"
            className="relative w-[min(15rem,40vh)] sm:w-[min(21.25rem,46vh)] h-auto select-none drop-shadow-[0_10px_26px_rgba(11,34,101,0.18)]"
          />
        </div>

        <div className="flex flex-col items-center gap-3 max-w-md">
          <span className="font-mono text-[10.5px] tracking-[0.22em] uppercase font-semibold text-accent/70">
            Product specialist
          </span>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-text-primary text-balance">
            Talk to a Trifast specialist, any time
          </h1>
          <p className="text-[13.5px] leading-relaxed text-text-muted text-balance [@media(max-height:480px)]:hidden">
            Ask about any fastener — specifications, materials, stock and lead
            times. Connect to start a live conversation.
          </p>
        </div>

        <div className="flex items-center gap-2 text-[11.5px] font-medium text-text-muted [@media(max-height:430px)]:hidden">
          <span className="w-1.5 h-1.5 rounded-full bg-accent/50 animate-pulse-dot" />
          Standing by
        </div>
      </div>
    </div>
  );
}
