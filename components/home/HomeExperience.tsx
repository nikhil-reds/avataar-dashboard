'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import AvatarPanel, { type AvatarPhase } from '@/components/AvatarPanel';
import { ExperienceFooter } from './ExperienceFooter';
import { HeroIntro } from './HeroIntro';
import { TapToTalkControl } from './TapToTalkControl';

const TRIGGER_DELTA = 36;

export function HomeExperience() {
  const [phase, setPhase] = useState<AvatarPhase>('idle');
  const [startKey, setStartKey] = useState<number | undefined>(undefined);
  const touchStartYRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  const isStarting = phase === 'connecting';
  const isLive = phase === 'live';
  const introVisible = !isLive;

  const requestStart = useCallback(() => {
    if (startedRef.current && phase !== 'ended') return;
    startedRef.current = true;
    setStartKey((key) => (key === undefined ? 1 : key + 1));
  }, [phase]);

  useEffect(() => {
    if (phase === 'ended' || phase === 'idle') startedRef.current = false;
  }, [phase]);

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY < -TRIGGER_DELTA) requestStart();
    };

    const onTouchStart = (event: TouchEvent) => {
      touchStartYRef.current = event.touches[0]?.clientY ?? null;
    };

    const onTouchEnd = (event: TouchEvent) => {
      const startY = touchStartYRef.current;
      touchStartYRef.current = null;
      const endY = event.changedTouches[0]?.clientY;
      if (startY === null || endY === undefined) return;
      if (startY - endY > TRIGGER_DELTA) requestStart();
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [requestStart]);

  return (
    <main className="relative h-dvh min-h-[42rem] w-full overflow-hidden bg-[#020219] text-white">
      <AvatarPanel
        autoStartKey={startKey}
        className={`absolute inset-0 z-40 bg-transparent transition-opacity duration-700 ${
          introVisible ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
        showIdleScreen={false}
        showStageControl={false}
        showDisconnectControl
        onPhaseChange={setPhase}
      />

      <section
        aria-hidden={isLive}
        className={`absolute inset-0 isolate overflow-hidden bg-[#020219] transition-opacity duration-700 ${
          introVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div className="absolute left-1/2 top-1/2 aspect-[9/16] h-[min(100dvh,calc(100vw*16/9))] w-[min(100vw,calc(100dvh*9/16))] -translate-x-1/2 -translate-y-1/2 overflow-hidden bg-[#020219] [container-type:size]">
          <div className="absolute bg-[#0d0e08]" style={{ left: '-34.907%', top: '-1.875%', width: '293.611%', height: '121.875%' }}>
            <Image
              src="/figma/avtaar-home/blue-stage.svg"
              alt=""
              width={2160}
              height={1372}
              priority
              className="pointer-events-none absolute max-w-none select-none"
              style={{ left: '1.986%', top: '43.504%', width: '64.43%', height: '58.5%' }}
            />
            <Image
              src="/figma/avtaar-home/noise-dark.png"
              alt=""
              width={1024}
              height={1024}
              priority
              className="pointer-events-none absolute max-w-none select-none opacity-25 mix-blend-overlay"
              style={{ left: '31.37%', top: '1.538%', width: '60.548%', height: '46.154%' }}
            />
          </div>

          <Image
            src="/figma/avtaar-home/background.png"
            alt=""
            width={1536}
            height={1024}
            priority
            className="pointer-events-none absolute max-w-none select-none object-cover opacity-10"
            style={{ left: '-77.87%', top: '-13.906%', width: '320.833%', height: '120.313%' }}
          />
          <Image
            src="/figma/avtaar-home/mark-left.svg"
            alt=""
            width={552}
            height={628}
            priority
            className="pointer-events-none absolute max-w-none select-none"
            style={{ left: '10.926%', top: '13.502%', width: '51.13%', height: '32.683%' }}
          />
          <Image
            src="/figma/avtaar-home/mark-right.svg"
            alt=""
            width={507}
            height={628}
            priority
            className="pointer-events-none absolute max-w-none select-none"
            style={{ left: '42.156%', top: '13.502%', width: '46.918%', height: '32.683%' }}
          />

          <HeroIntro />
          <TapToTalkControl
            disabled={isStarting}
            label={isStarting ? 'Connecting' : 'Tap to talk'}
            onActivate={requestStart}
          />
          <ExperienceFooter />
        </div>
      </section>
    </main>
  );
}
