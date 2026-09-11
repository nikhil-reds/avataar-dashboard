import { NextResponse } from 'next/server';

const API_BASE = 'https://api.liveavatar.com';
// Free sandbox avatar — used when LIVEAVATAR_AVATAR_ID is not set
const SANDBOX_AVATAR_ID = 'dd73ea75-1218-4ef3-92ce-606d5f7fbc0a';

export async function POST() {
  const apiKey = process.env.LIVEAVATAR_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'LIVEAVATAR_API_KEY not configured' }, { status: 500 });
  }

  const avatarId = process.env.LIVEAVATAR_AVATAR_ID;
  const contextId = process.env.LIVEAVATAR_CONTEXT_ID;
  const isSandbox = !contextId;

  const body: Record<string, unknown> = {
    mode: 'FULL',
    avatar_id: avatarId || SANDBOX_AVATAR_ID,
    avatar_persona: { language: 'en' },
  };

  if (isSandbox) {
    body.is_sandbox = true;
    body.avatar_id = SANDBOX_AVATAR_ID;
  } else {
    (body.avatar_persona as Record<string, unknown>).context_id = contextId;
  }

  const res = await fetch(`${API_BASE}/v1/sessions/token`, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text }, { status: res.status });
  }

  const { data } = await res.json();
  return NextResponse.json({ session_token: data.session_token });
}

export async function DELETE(request: Request) {
  const apiKey = process.env.LIVEAVATAR_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'LIVEAVATAR_API_KEY not configured' }, { status: 500 });
  }

  let session_token: string;
  try {
    ({ session_token } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Missing session_token' }, { status: 400 });
  }

  await fetch(`${API_BASE}/v1/sessions/stop`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session_token}` },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
