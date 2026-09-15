'use client';

import AvatarPanel from "@/components/AvatarPanel";
import { useCallback, useRef } from "react";

export default function AIVideoAgent() {
  const speakRef = useRef<((text: string) => void) | null>(null);

  const handleSessionReady = useCallback((speak: (text: string) => void) => {
    speakRef.current = speak;
  }, []);

  return (
    <div className="h-dvh w-full overflow-hidden bg-bg-primary text-text-primary">
      <AvatarPanel onSessionReady={handleSessionReady} />
    </div>
  );
}
