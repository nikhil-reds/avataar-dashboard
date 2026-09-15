'use client';

import AvatarPanel from "@/components/AvatarPanel";
import Header from "@/components/Header";
import { useCallback, useRef, useState } from "react";



export default function AIVideoAgent() {
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'live' | 'ended'>('idle');
  const [seconds, setSeconds]             = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speakRef = useRef<((text: string) => void) | null>(null);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const handleSessionStart = useCallback(() => {
    setSessionStatus('live');
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }, []);

  const handleSessionEnd = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    speakRef.current = null;
    setSessionStatus('ended');
  }, []);

  const handleSessionReady = useCallback((speak: (text: string) => void) => {
    speakRef.current = speak;
  }, []);

  return (
    <div className="flex flex-col h-dvh w-full overflow-hidden bg-bg-primary text-text-primary">

      <main className="flex-1 flex items-center justify-center overflow-hidden min-h-0">
        <AvatarPanel
          isActive={sessionStatus === 'live'}
          onStart={handleSessionStart}
          onEnd={handleSessionEnd}
          onSessionReady={handleSessionReady}
        />
      </main>
    </div>
  );
}
