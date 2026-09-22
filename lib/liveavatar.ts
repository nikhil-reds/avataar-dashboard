// Client-side only — only import from 'use client' components

/**
 * Which side generates the avatar's answers.
 *
 * `redis` — this app answers from the Redis avatar context cache, then hands the short
 * text to LiveAvatar to speak. This is the fast path for kiosk conversations.
 *
 * `local` — legacy local-model path.
 *
 * `heygen` — HeyGen's agent answers from its configured context, as it did before the
 * knowledge base existed. Nothing in this app grounds those answers.
 */
export type AvatarBrain = 'redis' | 'local' | 'heygen';

export interface AvatarSessionToken {
  token: string;
  brain: AvatarBrain;
}

/** The server decides the brain, so the mode cannot drift between the two sides. */
export async function fetchSessionToken(): Promise<AvatarSessionToken> {
  const res = await fetch('/api/liveavatar', { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Failed to create LiveAvatar session');
  }
  const { session_token, brain } = await res.json();
  return {
    token: session_token,
    brain: brain === 'heygen' || brain === 'local' ? brain : 'redis',
  };
}

export async function stopSessionOnServer(sessionToken: string): Promise<void> {
  await fetch('/api/liveavatar', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_token: sessionToken }),
  }).catch(() => {});
}

/**
 * Report a turn lifecycle event to the orchestration route.
 *
 * Fire-and-forget by design: this is support telemetry and state, and the avatar must
 * keep talking whether or not it lands. `keepalive` lets a final report survive the
 * page being closed mid-turn.
 */
export function reportTurnEvent(payload: {
  sessionId: string | null;
  turnId: string | null;
  text?: string;
  action: 'partial' | 'final' | 'interrupt' | 'answer_started' | 'answer_completed';
}): void {
  void fetch('/api/agent/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}
