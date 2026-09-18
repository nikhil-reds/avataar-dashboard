import { NextResponse } from 'next/server';
import { LogKind, LogStatus } from '@prisma/client';
import { recordActivity } from '@/lib/activity';
import { warmUpModel } from '@/lib/llm';

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

  // Who answers the shopper. Defaults to this app, whose answers are grounded in the
  // knowledge base in Postgres. Set AVATAR_BRAIN=heygen to hand answering back to
  // HeyGen's own agent — the behaviour before the knowledge base existed.
  const brain = process.env.AVATAR_BRAIN === 'heygen' ? 'heygen' : 'local';

  // A context is what gives HeyGen's agent its own opinions. Attaching one while this app
  // is also answering would have both of them reply to every question, so it is attached
  // only when HeyGen is the brain.
  const useHeyGenBrain = brain === 'heygen' && Boolean(contextId);
  const isSandbox = !avatarId;

  const body: Record<string, unknown> = {
    mode: 'FULL',
    avatar_id: avatarId || SANDBOX_AVATAR_ID,
    avatar_persona: { language: 'en' },
  };

  if (isSandbox) {
    body.is_sandbox = true;
    body.avatar_id = SANDBOX_AVATAR_ID;
  }

  if (useHeyGenBrain) {
    (body.avatar_persona as Record<string, unknown>).context_id = contextId;
  }

  // Fire-and-forget, in parallel with the token request: the model loads while HeyGen is
  // still setting up the stream, so the first question does not wait for it. Only useful
  // when this app is the one answering.
  if (brain === 'local') void warmUpModel();

  const startedAt = Date.now();
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
    await recordActivity({
      event: 'LiveAvatar token request failed',
      kind: LogKind.SESSION,
      status: LogStatus.ERROR,
      model: 'liveavatar',
      latencyMs: Date.now() - startedAt,
      detail: text.slice(0, 500),
    });
    return NextResponse.json({ error: text }, { status: res.status });
  }

  const { data } = await res.json();

  await recordActivity({
    event: 'LiveAvatar token issued',
    kind: LogKind.SESSION,
    model: 'liveavatar',
    latencyMs: Date.now() - startedAt,
    detail: `${brain} brain · ${isSandbox ? 'sandbox avatar' : 'avatar ' + avatarId}`,
  });

  // `brain` is additive — the client reads it to decide whether to answer questions
  // itself, so the mode is decided in one place rather than configured twice.
  return NextResponse.json({ session_token: data.session_token, brain });
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
