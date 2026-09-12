// Client-side only — only import from 'use client' components

/**
 * Which side generates the avatar's answers.
 *
 * `local` — this app answers: retrieval over the knowledge base in Postgres, then Gemini,
 * then the text is handed to the avatar to speak. HeyGen's own agent is not given a
 * context, so it does not answer on its own.
 *
 * `heygen` — HeyGen's agent answers from its configured context, as it did before the
 * knowledge base existed. Nothing in this app grounds those answers.
 */
export type AvatarBrain = 'local' | 'heygen';

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
  return { token: session_token, brain: brain === 'heygen' ? 'heygen' : 'local' };
}

export async function stopSessionOnServer(sessionToken: string): Promise<void> {
  await fetch('/api/liveavatar', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_token: sessionToken }),
  }).catch(() => {});
}
