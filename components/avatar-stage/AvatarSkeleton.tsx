/**
 * Shown between the connect click and the first video frame.
 *
 * The blocks trace the shape of the avatar that is about to replace them — head
 * and shoulders anchored to the bottom of the portrait frame, the way a real
 * talking-head shot is composed — so the switch to the live stream reads as the
 * same picture resolving rather than one screen being swapped for another.
 *
 * Sizes are percentages of the frame rather than fixed pixels, so the figure
 * keeps its proportions at any stage height.
 */
export function AvatarSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Connecting to the avatar"
      className="absolute inset-0 overflow-hidden bg-bg-tertiary"
    >
      <div className="absolute inset-0 flex flex-col items-center justify-end">
        <div className="w-[33%] aspect-square rounded-full skeleton-block" />
        <div className="mt-[2.5%] w-[76%] h-[52%] rounded-t-[50%] skeleton-block" />
      </div>

      {/* Same corner the live "Speaking" badge occupies, so nothing jumps when the
          stream takes over. */}
      <div
        className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-3.5 py-2 rounded-full
                   bg-surface-glass backdrop-blur-md border border-border-subtle shadow-lg"
      >
        <span className="w-3.5 h-3.5 rounded-full border-2 border-accent/25 border-t-accent animate-spin" />
        <span className="text-[11px] font-medium text-text-primary">Connecting…</span>
      </div>
    </div>
  );
}
