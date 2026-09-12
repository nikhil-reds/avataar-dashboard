'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

/** Flush cadence. Short enough that a crash loses little, long enough to stay batched. */
const FLUSH_INTERVAL_MS = 2000;
const FLUSH_AT_QUEUE_LENGTH = 5;
const MAX_BATCH = 50;

type Speaker = 'SHOPPER' | 'AVATAR' | 'SYSTEM';

interface PendingTurn {
  eventId: string;
  seq: number;
  who: Speaker;
  text: string;
  spokenAt: string;
}

/**
 * Persists a live avatar conversation, turn by turn.
 *
 * Turns are buffered and flushed in batches rather than posted per utterance, and each
 * carries a client-assigned `seq` so the transcript can be replayed in the order it was
 * spoken even when requests land out of order.
 */
export function useConversationRecorder() {
  const sessionIdRef = useRef<string | null>(null);
  // True from the moment recording starts, before the session id has come back. Turns
  // spoken during that window (the avatar's greeting, typically) still need buffering.
  const activeRef = useRef(false);
  const queueRef = useRef<PendingTurn[]>([]);
  const seqRef = useRef(0);
  const flushingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const flush = useCallback(async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || flushingRef.current || queueRef.current.length === 0) return;

    const batch = queueRef.current.splice(0, MAX_BATCH);
    flushingRef.current = true;

    try {
      const res = await fetch(`/api/sessions/${sessionId}/turns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turns: batch }),
      });
      if (!res.ok) throw new Error(`turns flush failed: ${res.status}`);
    } catch (err) {
      // Put the batch back at the head so a transient failure delays turns rather than
      // dropping them. The unique eventId makes the eventual retry idempotent.
      queueRef.current.unshift(...batch);
      console.error('[recorder]', err);
    } finally {
      flushingRef.current = false;
    }
  }, []);

  /**
   * Last-gasp flush for page unload. A normal fetch is cancelled when the tab closes,
   * which would lose the tail of the conversation; sendBeacon survives it.
   */
  const flushWithBeacon = useCallback(() => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || queueRef.current.length === 0) return;
    if (typeof navigator === 'undefined' || !navigator.sendBeacon) return;

    const batch = queueRef.current.splice(0, MAX_BATCH);
    const payload = new Blob([JSON.stringify({ turns: batch })], { type: 'application/json' });
    const sent = navigator.sendBeacon(`/api/sessions/${sessionId}/turns`, payload);
    if (!sent) queueRef.current.unshift(...batch);
  }, []);

  const enqueue = useCallback(
    (who: Speaker, eventId: string, text: string) => {
      if (!activeRef.current || !text?.trim()) return;

      queueRef.current.push({
        eventId,
        seq: seqRef.current++,
        who,
        text,
        spokenAt: new Date().toISOString(),
      });

      if (queueRef.current.length >= FLUSH_AT_QUEUE_LENGTH) void flush();
      // Nothing is lost while the id is pending: flush() no-ops until it arrives.
    },
    [flush]
  );

  const start = useCallback(
    async (avatarSessionId: string | null) => {
      queueRef.current = [];
      seqRef.current = 0;
      activeRef.current = true;

      try {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            avatarSessionId,
            locale: typeof navigator !== 'undefined' ? navigator.language : null,
          }),
        });
        if (!res.ok) throw new Error(`session create failed: ${res.status}`);

        const { id } = await res.json();
        sessionIdRef.current = id;
      } catch (err) {
        // Recording is best-effort: a persistence outage must not take the avatar down.
        console.error('[recorder]', err);
        sessionIdRef.current = null;
        activeRef.current = false;
        return;
      }

      timerRef.current = setInterval(() => void flush(), FLUSH_INTERVAL_MS);
    },
    [flush]
  );

  const end = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    activeRef.current = false;

    const sessionId = sessionIdRef.current;
    if (!sessionId) return;

    // Drain before closing, so the final answer is stored before duration is computed.
    await flush();

    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ENDED', endedAt: new Date().toISOString() }),
      });
    } catch (err) {
      console.error('[recorder]', err);
    }

    sessionIdRef.current = null;
  }, [flush]);

  useEffect(() => {
    // `pagehide` fires on tab close and on mobile backgrounding, where `beforeunload`
    // is unreliable.
    const onPageHide = () => flushWithBeacon();
    window.addEventListener('pagehide', onPageHide);

    return () => {
      window.removeEventListener('pagehide', onPageHide);
      if (timerRef.current) clearInterval(timerRef.current);
      flushWithBeacon();
    };
  }, [flushWithBeacon]);

  const recordShopper = useCallback(
    (eventId: string, text: string) => enqueue('SHOPPER', eventId, text),
    [enqueue]
  );

  const recordAvatar = useCallback(
    (eventId: string, text: string) => enqueue('AVATAR', eventId, text),
    [enqueue]
  );

  /**
   * The stored conversation's id, or null before it has been created. Read as a function
   * rather than exposed as state so that consumers see the current value without the
   * recorder re-rendering them mid-conversation.
   */
  const currentSessionId = useCallback(() => sessionIdRef.current, []);

  // Memoised: consumers put this object in useCallback dependency arrays, and a fresh
  // object each render would rebuild their handlers on every state change.
  return useMemo(
    () => ({ start, end, recordShopper, recordAvatar, currentSessionId }),
    [start, end, recordShopper, recordAvatar, currentSessionId]
  );
}
