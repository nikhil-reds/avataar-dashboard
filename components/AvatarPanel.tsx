'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { fetchSessionToken, stopSessionOnServer, type AvatarBrain } from '@/lib/liveavatar';
import { useConversationRecorder } from '@/lib/useConversationRecorder';
import type { LiveAvatarSession } from '@heygen/liveavatar-web-sdk';

/** Conversational context sent with each question. Older turns are dropped server-side. */
interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_LOCAL_HISTORY = 20;

/** Spoken when the knowledge pipeline cannot be reached, so the avatar is never mute. */
const FALLBACK_REPLY =
  'Sorry, I could not reach my knowledge base just then. Could you ask me that again?';

export interface AvatarPanelProps {
  isActive: boolean;
  onStart: () => void;
  onEnd: () => void;
  onUserTranscription?: (text: string) => void;
  onAvatarTranscription?: (text: string) => void;
  onSessionReady?: (speak: (text: string) => void) => void;
}

export default function AvatarPanel({
  isActive,
  onStart,
  onEnd,
  onUserTranscription,
  onAvatarTranscription,
  onSessionReady,
}: AvatarPanelProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [audioLocked, setAudioLocked] = useState(false);

  const recorder = useConversationRecorder();

  const sessionRef      = useRef<LiveAvatarSession | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const videoRef        = useRef<HTMLVideoElement>(null);
  const keepAliveRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const startingRef     = useRef(false);

  // Set from the token response. While it reads 'heygen' this component stays a pure
  // renderer and HeyGen's agent answers, exactly as it did before the knowledge base.
  const brainRef        = useRef<AvatarBrain>('local');
  const historyRef      = useRef<ChatTurn[]>([]);
  // Increments per question. An answer whose ticket is stale — the shopper spoke again
  // while it was being generated — is discarded rather than spoken out of turn.
  const questionSeqRef  = useRef(0);

  useEffect(() => {
    if (!isActive) return;
    keepAliveRef.current = setInterval(async () => {
      try { await sessionRef.current?.keepAlive(); } catch {}
    }, 120_000);
    return () => { if (keepAliveRef.current) clearInterval(keepAliveRef.current); };
  }, [isActive]);

  useEffect(() => {
    return () => {
      if (keepAliveRef.current) clearInterval(keepAliveRef.current);
      sessionRef.current?.stop().catch(() => {});
      if (sessionTokenRef.current) stopSessionOnServer(sessionTokenRef.current);
    };
  }, []);

  const unlockAudio = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.play().catch(() => {});
    setAudioLocked(false);
  }, []);

  /**
   * Answers one spoken question from the knowledge base.
   *
   * The chat API does the retrieval and the generation; this only carries the question
   * there and hands the answer to the avatar to speak. `message()` is the SDK's
   * "speak this as your response" command, so the avatar's own transcription event still
   * fires and the conversation recorder stores the turn as normal.
   */
  const answerQuestion = useCallback(
    async (question: string) => {
      const session = sessionRef.current;
      if (!session || !question.trim()) return;

      const ticket = ++questionSeqRef.current;

      let reply: string;
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: question,
            history: historyRef.current,
            sessionId: recorder.currentSessionId(),
          }),
        });

        if (!res.ok) {
          // Carry the server's explanation into the message, so the console says what is
          // actually wrong rather than just the status code.
          const failure = await res.json().catch(() => ({}));
          throw new Error(
            `chat failed (${res.status}): ${failure.error ?? 'no detail from server'}`
          );
        }
        const data = await res.json();
        reply = typeof data.response === 'string' && data.response.trim() ? data.response : FALLBACK_REPLY;
      } catch (err) {
        console.error('[avatar]', err);
        reply = FALLBACK_REPLY;
      }

      // The shopper asked something else while this was in flight, or ended the session.
      if (ticket !== questionSeqRef.current || sessionRef.current !== session) return;

      const nextHistory: ChatTurn[] = [
        ...historyRef.current,
        { role: 'user', content: question },
        { role: 'assistant', content: reply },
      ];
      historyRef.current = nextHistory.slice(-MAX_LOCAL_HISTORY);

      try {
        session.message(reply);
      } catch (err) {
        console.error('[avatar] could not speak the answer', err);
      }
    },
    [recorder]
  );

  const handleStart = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    setIsLoading(true);
    setError(null);
    setAudioLocked(false);

    try {
      const { LiveAvatarSession, SessionEvent, AgentEventsEnum } = await import(
        '@heygen/liveavatar-web-sdk'
      );

      const { token, brain } = await fetchSessionToken();
      sessionTokenRef.current = token;
      brainRef.current = brain;
      historyRef.current = [];
      questionSeqRef.current = 0;

      const session = new LiveAvatarSession(token);
      sessionRef.current = session;

      session.on(SessionEvent.SESSION_STREAM_READY, () => {
        const video = videoRef.current;
        if (!video) return;
        session.attach(video);
        video.muted = false;
        video.play().catch(() => {
          video.muted = true;
          setAudioLocked(true);
        });
      });

      session.on(SessionEvent.SESSION_DISCONNECTED, () => {
        setIsSpeaking(false);
        setAudioLocked(false);
      });

      session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => setIsSpeaking(true));
      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED,   () => setIsSpeaking(false));

      // Only the finalized transcription events are persisted. The *_CHUNK variants are
      // streaming partials and would write a row per fragment.
      session.on(AgentEventsEnum.USER_TRANSCRIPTION, (e) => {
        recorder.recordShopper(e.event_id, e.text);
        onUserTranscription?.(e.text);

        // This is the knowledge base entering the conversation: the finalized question
        // goes to the chat API, which grounds the answer in Postgres.
        if (brainRef.current === 'local') void answerQuestion(e.text);
      });
      session.on(AgentEventsEnum.AVATAR_TRANSCRIPTION, (e) => {
        recorder.recordAvatar(e.event_id, e.text);
        onAvatarTranscription?.(e.text);
      });

      session.on(AgentEventsEnum.SESSION_STOPPED, () => {
        setIsSpeaking(false);
        setAudioLocked(false);
        void recorder.end();
      });

      await session.start();

      // Begins buffering immediately, so the avatar's opening line is captured while the
      // session record is still being created.
      void recorder.start(session.sessionId);
      await session.voiceChat.start().catch((e) => console.error('[LiveAvatar] voiceChat.start() failed:', e));

      onSessionReady?.((text: string) => session.message(text));
      onStart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
      sessionRef.current = null;
      sessionTokenRef.current = null;
    } finally {
      setIsLoading(false);
      startingRef.current = false;
    }
  }, [onStart, onUserTranscription, onAvatarTranscription, onSessionReady, recorder, answerQuestion]);

  const handleEnd = useCallback(async () => {
    if (keepAliveRef.current) clearInterval(keepAliveRef.current);
    // Invalidates any answer still in flight, so it cannot be spoken into a dead session.
    questionSeqRef.current++;
    await recorder.end();
    try { await sessionRef.current?.stop(); } catch {}
    if (sessionTokenRef.current) stopSessionOnServer(sessionTokenRef.current);
    sessionRef.current = null;
    sessionTokenRef.current = null;
    historyRef.current = [];
    setIsSpeaking(false);
    setAudioLocked(false);
    onEnd();
  }, [onEnd, recorder]);

  return (
    <section className="relative flex flex-col items-center justify-center w-full h-full overflow-hidden bg-bg-primary p-6 transition-all duration-700">

      {/* Ambient glow behind video when live */}
      {isActive && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-105 h-105 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.12)_0%,transparent_70%)] blur-3xl" />
        </div>
      )}

      {/* Video card */}
      <div
        className={`group relative w-full max-w-120 flex-1 min-h-0 rounded-3xl overflow-hidden shadow-2xl transition-all duration-500
          ${isActive
            ? 'border border-accent/25 shadow-[0_8px_40px_rgba(0,0,0,0.5),0_0_60px_rgba(99,102,241,0.12)]'
            : 'border border-border-subtle shadow-[0_4px_24px_rgba(0,0,0,0.3)]'
          }`}
      >
        {/* Stream */}
        <video
          ref={videoRef}
          className="w-full h-full object-cover block bg-bg-tertiary"
          autoPlay
          playsInline
        />

        {/* Tap-to-unlock audio overlay */}
        {audioLocked && (
          <button
            onClick={(e) => { e.stopPropagation(); unlockAudio(); }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/55 backdrop-blur-[2px] transition-opacity"
          >
            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/25 flex items-center justify-center">
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
              </svg>
            </div>
            <p className="text-white/90 text-[13px] font-medium">Tap to enable audio</p>
          </button>
        )}

        {/* Idle placeholder — shown when not active */}
        {!isActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-linear-to-b from-bg-tertiary to-bg-secondary">
            <div className="relative">
              <div className="w-25 h-25 rounded-full bg-linear-to-br from-accent/15 to-accent/5 border border-accent/15 flex items-center justify-center">
                <svg className="w-10 h-10 text-accent/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="absolute -inset-3.5 rounded-full border border-dashed border-accent/15 animate-spin-slow" />
            </div>

            {error ? (
              <p className="text-[12px] text-[#ef4444] text-center max-w-55 leading-relaxed px-4">{error}</p>
            ) : (
              <p className="text-[12px] text-text-muted text-center max-w-50 leading-relaxed">
                Start a session to connect with the AI Avatar
              </p>
            )}

            {/* Start Session button — always visible in idle state */}
            <button
              onClick={handleStart}
              disabled={isLoading}
              className="group/btn flex items-center gap-2.5 px-7 py-3 rounded-full bg-accent text-white text-[13px] font-semibold
                         shadow-[0_2px_20px_rgba(99,102,241,0.25)] hover:shadow-[0_4px_28px_rgba(99,102,241,0.4)]
                         hover:bg-[#5558e6] active:scale-[0.97] transition-all duration-200
                         disabled:opacity-60 disabled:cursor-wait"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 fill-current transition-transform group-hover/btn:scale-110" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
              {isLoading ? 'Connecting…' : 'Start Session'}
            </button>
          </div>
        )}

        {/* End Session hover overlay — shown only when active, on hover */}
        {isActive && !audioLocked && (
          <div className="pointer-events-none absolute inset-0 z-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={handleEnd}
              className="pointer-events-auto flex items-center gap-2.5 px-6 py-3 rounded-full
                         bg-black/40 backdrop-blur-md border border-white/20 text-white text-[13px] font-semibold
                         hover:bg-[#ef4444]/70 hover:border-[#ef4444]/50 active:scale-[0.97] transition-all duration-200 shadow-lg"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <rect x="5" y="5" width="14" height="14" rx="2" />
              </svg>
              End Session
            </button>
          </div>
        )}

        {/* Speaking waveform badge */}
        <div
          className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3.5 py-2 rounded-full bg-bg-card/80 backdrop-blur-md border border-border-subtle shadow-lg pointer-events-none transition-all duration-300
            ${isSpeaking ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
        >
          <div className="flex items-end gap-0.75 h-3.5">
            {[0, 0.15, 0.3, 0.45, 0.6].map((delay, i) => (
              <span
                key={i}
                className="w-0.75 rounded-xs bg-accent animate-bar-bounce"
                style={{ height: [6, 12, 8, 14, 6][i], animationDelay: `${delay}s` }}
              />
            ))}
          </div>
          <span className="text-[11px] font-medium text-text-primary">Speaking</span>
        </div>
      </div>
    </section>
  );
}
