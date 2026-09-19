// Client-side only — only import from 'use client' components

export async function fetchSessionToken(): Promise<string> {
  const res = await fetch('/api/liveavatar', { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? 'Failed to create LiveAvatar session');
  }
  const { session_token } = await res.json();
  return session_token;
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
