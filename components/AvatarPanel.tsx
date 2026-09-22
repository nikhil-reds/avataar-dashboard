'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  fetchSessionToken,
  reportTurnEvent,
  stopSessionOnServer,
  type AvatarBrain,
} from '@/lib/liveavatar';
import { MicOff, Loader2 } from 'lucide-react';
import { TurnManager } from '@/lib/agent/turnManager';
import { useConversationRecorder } from '@/lib/useConversationRecorder';
import { describeMicFailure, type MicFailure } from '@/lib/microphone';
import { ScreenSaver } from '@/components/avatar-stage/ScreenSaver';
import { AvatarSkeleton } from '@/components/avatar-stage/AvatarSkeleton';
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
/**
 * `connecting` covers everything between the click and the first video frame —
 * token mint, WebRTC negotiation and stream attach — because that whole stretch
 * looks identical to the shopper: a screen with no avatar on it yet.
 */
export type AvatarPhase = 'idle' | 'connecting' | 'live' | 'ended';

export interface AvatarPanelProps {
  onPhaseChange?: (phase: AvatarPhase) => void;
  onUserTranscription?: (text: string) => void;
  onAvatarTranscription?: (text: string) => void;
  onSessionReady?: (speak: (text: string) => void) => void;
}

export default function AvatarPanel({
  onPhaseChange,
  onUserTranscription,
  onAvatarTranscription,
  onSessionReady,
}: AvatarPanelProps) {
  const [phase, setPhase]             = useState<AvatarPhase>('idle');
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [audioLocked, setAudioLocked] = useState(false);
  const [micFailure, setMicFailure]   = useState<MicFailure | null>(null);
  const [micRetrying, setMicRetrying] = useState(false);

  const recorder = useConversationRecorder();

  const sessionRef      = useRef<LiveAvatarSession | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const videoRef        = useRef<HTMLVideoElement>(null);
  const audioRef        = useRef<HTMLAudioElement>(null);
  const keepAliveRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const startingRef     = useRef(false);
  const turnsRef        = useRef<TurnManager | null>(null);

  // Set from the token response. In `redis` and `local` modes this app writes the words
  // and LiveAvatar only speaks them; `heygen` lets LiveAvatar's own agent answer.
  const brainRef        = useRef<AvatarBrain>('local');
  const historyRef      = useRef<ChatTurn[]>([]);
  // Increments per question. An answer whose ticket is stale — the shopper spoke again
  // while it was being generated — is discarded rather than spoken out of turn.
  const questionSeqRef  = useRef(0);
  const isLive = phase === 'live';

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);

  useEffect(() => {
    if (!isLive) return;
    keepAliveRef.current = setInterval(async () => {
      try { await sessionRef.current?.keepAlive(); } catch {}
    }, 120_000);
    return () => { if (keepAliveRef.current) clearInterval(keepAliveRef.current); };
  }, [isLive]);

  useEffect(() => {
    return () => {
      if (keepAliveRef.current) clearInterval(keepAliveRef.current);
      turnsRef.current?.reset();
      sessionRef.current?.stop().catch(() => {});
      if (sessionTokenRef.current) stopSessionOnServer(sessionTokenRef.current);
    };
  }, []);

  const unlockAudio = useCallback(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video && !audio) return;

    const playables = [video, audio].filter(Boolean) as HTMLMediaElement[];
    for (const el of playables) {
      el.muted = false;
      el.volume = 1;
    }

    Promise.all(playables.map((el) => el.play()))
      .then(() => setAudioLocked(false))
      .catch(() => setAudioLocked(true));
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

  /**
   * Bring the shopper's microphone up.
   *
   * A missing, blocked or busy microphone is a normal condition on a kiosk, not a
   * crash: the avatar still streams and speaks, the shopper just cannot talk back.
   * So the failure is surfaced in the UI with something to do about it, and logged
   * with `console.warn` — `console.error` would raise it in the Next dev overlay as
   * though the page had thrown.
   */
  const startVoiceChat = useCallback(async (session: LiveAvatarSession) => {
    try {
      await session.voiceChat.start();
      setMicFailure(null);
      return true;
    } catch (err) {
      const failure = describeMicFailure(err);
      console.warn(`[LiveAvatar] voice chat unavailable (${failure.reason}):`, err);
      setMicFailure(failure);
      return false;
    }
  }, []);

  // `voiceChat.start()` resets itself to INACTIVE when it throws, so retrying after
  // the shopper plugs in a mic or grants permission works on the same session.
  const retryMic = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || micRetrying) return;
    setMicRetrying(true);
    await startVoiceChat(session);
    setMicRetrying(false);
  }, [micRetrying, startVoiceChat]);

  const handleStart = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    setPhase('connecting');
    setError(null);
    setAudioLocked(false);
    setMicFailure(null);

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

      /**
       * Application-side turn tracking. HeyGen still owns the LLM and the voice —
       * this only observes the conversation to manage turn state, interruption and
       * latency. `speakBuffer` is opt-in because in FULL mode HeyGen answers every
       * utterance itself, and a client filler on top of that has not been verified
       * against a live session.
       */
      const turns = new TurnManager(
        {
          speakText: (text) => session.repeat(text),
          speakAudio: (url) => session.repeatAudio(url),
          interrupt: () => session.interrupt(),
          report: reportTurnEvent,
        },
        { speakBuffer: process.env.NEXT_PUBLIC_AVATAR_BUFFER === 'on' }
      );
      turnsRef.current = turns;

      session.on(SessionEvent.SESSION_STREAM_READY, () => {
        const video = videoRef.current;
        const audio = audioRef.current;
        if (!video) return;
        session.attach(video);

        const remoteAudioTrack = (session as unknown as {
          _remoteAudioTrack?: { attach: (element: HTMLMediaElement) => unknown };
        })._remoteAudioTrack;
        if (audio && remoteAudioTrack) remoteAudioTrack.attach(audio);

        video.muted = false;
        video.volume = 1;
        if (audio) {
          audio.muted = false;
          audio.volume = 1;
        }

        const playables = [video, audio].filter(Boolean) as HTMLMediaElement[];
        Promise.all(playables.map((el) => el.play()))
          .then(() => setAudioLocked(false))
          .catch(() => {
            video.muted = true;
            if (audio) audio.muted = true;
            setAudioLocked(true);
          });
        // The skeleton is held until here rather than until `start()` resolves,
        // so it is never replaced by an empty video element.
        setPhase('live');

        if (brainRef.current === 'redis') {
          window.setTimeout(() => {
            if (sessionRef.current !== session) return;
            void answerQuestion('hello');
          }, 600);
        }
      });

      session.on(SessionEvent.SESSION_DISCONNECTED, () => {
        setIsSpeaking(false);
        setAudioLocked(false);
        setPhase('ended');
      });

      session.on(AgentEventsEnum.AVATAR_SPEAK_STARTED, () => {
        setIsSpeaking(true);
        turns.onAvatarSpeakStarted();
      });
      session.on(AgentEventsEnum.AVATAR_SPEAK_ENDED, () => {
        setIsSpeaking(false);
        turns.onAvatarSpeakEnded();
      });

      // Barge-in. The manager only issues avatar.interrupt when the avatar is actually
      // speaking, so an ordinary turn boundary does not fire a needless command.
      session.on(AgentEventsEnum.USER_SPEAK_STARTED, () => turns.onUserSpeakStarted());

      // Partials are UI-only: no turn, no retrieval, no network.
      session.on(AgentEventsEnum.USER_TRANSCRIPTION_CHUNK, (e) =>
        turns.onPartialTranscript(e.text)
      );

      // Only the finalized transcription events are persisted. The *_CHUNK variants are
      // streaming partials and would write a row per fragment.
      session.on(AgentEventsEnum.USER_TRANSCRIPTION, (e) => {
        // Opens the turn and fires the buffer fast path before any network call.
        turns.onFinalTranscript(e.text, e.event_id);
        recorder.recordShopper(e.event_id, e.text);
        onUserTranscription?.(e.text);

        // This is the app brain entering the conversation: Redis/local modes generate
        // the short content, then LiveAvatar speaks it with the configured voice.
        if (brainRef.current !== 'heygen') void answerQuestion(e.text);
      });
      session.on(AgentEventsEnum.AVATAR_TRANSCRIPTION, (e) => {
        recorder.recordAvatar(e.event_id, e.text);
        onAvatarTranscription?.(e.text);
      });

      session.on(AgentEventsEnum.SESSION_STOPPED, () => {
        setIsSpeaking(false);
        setAudioLocked(false);
        setPhase('ended');
        void recorder.end();
      });

      await session.start();

      // Begins buffering immediately, so the avatar's opening line is captured while the
      // session record is still being created.
      void recorder.start(session.sessionId);
      turns.attachSession(session.sessionId);
      await startVoiceChat(session);

      onSessionReady?.((text: string) => session.message(text));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
      sessionRef.current = null;
      sessionTokenRef.current = null;
      turnsRef.current = null;
      setPhase('idle');
    } finally {
      startingRef.current = false;
    }
  }, [onUserTranscription, onAvatarTranscription, onSessionReady, recorder, answerQuestion, startVoiceChat]);

  const handleEnd = useCallback(async () => {
    if (keepAliveRef.current) clearInterval(keepAliveRef.current);
    // Invalidates any answer still in flight, so it cannot be spoken into a dead session.
    questionSeqRef.current++;
    turnsRef.current?.reset();
    await recorder.end();
    try { await sessionRef.current?.stop(); } catch {}
    if (sessionTokenRef.current) stopSessionOnServer(sessionTokenRef.current);
    sessionRef.current = null;
    sessionTokenRef.current = null;
    historyRef.current = [];
    turnsRef.current = null;
    setIsSpeaking(false);
    setAudioLocked(false);
    setMicFailure(null);
    setPhase('ended');
  }, [recorder]);

  return (
    <section className="relative w-full h-full overflow-hidden bg-bg-primary">
      {(phase === 'idle' || phase === 'ended') && <ScreenSaver />}

      {/* The avatar is a portrait figure, so it gets a portrait frame rather than
          being stretched across the viewport. `w-auto` + `aspect-[9/16]` sizes it
          off the available height; `max-w-full` takes over on screens too narrow
          for that, which keeps it from overflowing on a phone. */}
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div
          className={`relative h-full w-auto max-w-full aspect-[9/16] rounded-3xl overflow-hidden
                      transition-all duration-700
            ${isLive
              ? 'opacity-100 scale-100 border border-accent/20 shadow-[0_18px_60px_rgba(11,34,101,0.22)]'
              : 'opacity-0 scale-[0.97] pointer-events-none'
            }`}
        >
          {/* Always mounted: `session.attach()` fires on SESSION_STREAM_READY and needs
              a real element to hand the track to, which a conditionally rendered one
              would not yet provide. */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover bg-bg-tertiary"
            autoPlay
            playsInline
          />
          <audio ref={audioRef} autoPlay playsInline className="hidden" />

          {/* Tap-to-unlock audio overlay */}
          {audioLocked && (
            <button
              onClick={unlockAudio}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/55 backdrop-blur-[2px]"
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

          {/* Voice chat could not start. The session is still usable — the avatar
              streams and speaks — so this informs rather than blocks. */}
          {micFailure && (
            <div className="absolute top-4 inset-x-4 z-10 flex flex-col sm:flex-row sm:items-start gap-2.5 sm:gap-3 px-3.5 py-3 rounded-2xl
                            bg-surface-glass backdrop-blur-md border border-border-subtle shadow-lg">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <MicOff className="w-4 h-4 mt-0.5 shrink-0 text-[#b91c1c]" />
                <div className="min-w-0 flex flex-col gap-0.5">
                  <p className="text-[12px] font-semibold text-text-primary">Voice chat is off</p>
                  <p className="text-[11.5px] leading-snug text-text-muted">{micFailure.message}</p>
                </div>
              </div>
              {micFailure.retryable && (
                <button
                  onClick={retryMic}
                  disabled={micRetrying}
                  className="shrink-0 self-end sm:self-auto flex items-center justify-center gap-1.5 px-3 py-2 min-h-9 rounded-lg text-[11.5px] font-semibold
                             text-white bg-accent hover:bg-[#123080] active:scale-[0.97] transition-all
                             disabled:opacity-60 disabled:cursor-wait"
                >
                  {micRetrying && <Loader2 className="w-3 h-3 animate-spin" />}
                  {micRetrying ? 'Trying…' : 'Try again'}
                </button>
              )}
            </div>
          )}

          {/* Speaking waveform badge */}
          <div
            className={`absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3.5 py-2 rounded-full
                        bg-surface-glass backdrop-blur-md border border-border-subtle shadow-lg pointer-events-none transition-all duration-300
              ${isSpeaking ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
          >
            <div className="flex items-end gap-0.75 h-3.5">
              {[0, 0.15, 0.3, 0.45, 0.6].map((delay, i) => (
                <span
                  key={i}
                  className="w-0.75 rounded-xs bg-accent animate-bar-bounce origin-bottom"
                  style={{ height: [6, 12, 8, 14, 6][i], animationDelay: `${delay}s` }}
                />
              ))}
            </div>
            <span className="text-[11px] font-medium text-text-primary">Speaking</span>
          </div>
        </div>
      </div>

      {/* Same portrait frame, so the placeholder occupies exactly the space the
          avatar is about to fill. */}
      {phase === 'connecting' && (
        <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="relative h-full w-auto max-w-full aspect-[9/16] rounded-3xl overflow-hidden border border-border-subtle">
            <AvatarSkeleton />
          </div>
        </div>
      )}

      {/* Single control for the whole stage, parked in the bottom-right corner so it
          stays in one place across every phase. */}
      <div
        className="absolute z-30 flex items-center gap-3"
        style={{
          // Keeps the control clear of the iOS home indicator and, in landscape, the
          // notch cut-out. Falls back to the plain 1.5rem where insets are 0.
          bottom: 'max(1.5rem, env(safe-area-inset-bottom))',
          right: 'max(1.5rem, env(safe-area-inset-right))',
        }}
      >
        {error && (
          <p className="max-w-60 text-right text-[12px] leading-snug font-medium text-[#b91c1c]">
            {error}
          </p>
        )}
        <StageControl phase={phase} onConnect={handleStart} onDisconnect={handleEnd} />
      </div>
    </section>
  );
}

const CONTROL_BASE =
  'flex items-center gap-2.5 px-7 py-3.5 rounded-full text-[13.5px] font-semibold text-white ' +
  'active:scale-[0.97] transition-all duration-200 disabled:cursor-wait';

function StageControl({
  phase,
  onConnect,
  onDisconnect,
}: {
  phase: AvatarPhase;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  if (phase === 'connecting') {
    return (
      <button disabled className={`${CONTROL_BASE} bg-accent/60`}>
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        Connecting…
      </button>
    );
  }

  if (phase === 'live') {
    return (
      <button
        onClick={onDisconnect}
        className={`${CONTROL_BASE} bg-[#b91c1c] hover:bg-[#991b1b] shadow-[0_4px_24px_rgba(185,28,28,0.32)]`}
      >
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <rect x="5" y="5" width="14" height="14" rx="2" />
        </svg>
        End session
      </button>
    );
  }

  return (
    <button
      onClick={onConnect}
      className={`${CONTROL_BASE} group bg-accent hover:bg-[#123080] shadow-[0_4px_28px_rgba(11,34,101,0.28)] hover:shadow-[0_6px_34px_rgba(11,34,101,0.4)]`}
    >
      <svg className="w-4 h-4 fill-current transition-transform group-hover:scale-110" viewBox="0 0 24 24">
        <path d="M8 5v14l11-7z" />
      </svg>
      {phase === 'ended' ? 'Connect again' : 'Connect'}
    </button>
  );
}
