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
