import { NextResponse } from 'next/server';
import { LogKind, LogStatus } from '@/app/generated/prisma';
import { recordActivity } from '@/lib/activity';
import { warmUpModel } from '@/lib/llm';
import { refreshAvatarContextCache } from '@/lib/avatarContextCache';
import { liveAvatarConfig } from '@/lib/liveavatarConfig';

const API_BASE = 'https://api.liveavatar.com';
// Free sandbox avatar — used when LIVEAVATAR_AVATAR_ID is not set
const SANDBOX_AVATAR_ID = 'dd73ea75-1218-4ef3-92ce-606d5f7fbc0a';

async function configuredVoiceExists(apiKey: string, voiceId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/v1/voices/${voiceId}`, {
    headers: { 'X-API-KEY': apiKey },
  });

  if (res.status === 404) return false;
  if (!res.ok) {
    console.warn(`[LiveAvatar] could not validate voice ${voiceId}: ${res.status}`);
    return true;
  }

  const data = await res.json().catch(() => null);
  return data?.code === 1000;
}

export async function POST() {
  const { apiKey, avatarId, contextId, voiceId, voiceAgentId } = liveAvatarConfig();
  if (!apiKey) {
    return NextResponse.json({ error: 'LIVEAVATAR_API_KEY not configured' }, { status: 500 });
  }

  // Who answers the shopper. `redis` is the fast app-owned brain; LiveAvatar only
  // supplies the streamed avatar and voice.
  const configuredBrain = process.env.AVATAR_BRAIN;
  const brain = configuredBrain === 'heygen' || configuredBrain === 'local' ? configuredBrain : 'redis';

  // A context is what gives HeyGen's agent its own opinions. Attaching one while this app
  // is also answering would have both of them reply to every question, so it is attached
  // only when HeyGen is the brain. A voice agent already owns its voice/model/context.
  const useVoiceAgent = brain === 'heygen' && Boolean(voiceAgentId);
  const useHeyGenContext = brain === 'heygen' && Boolean(contextId) && !useVoiceAgent;
  const isSandbox = !avatarId;

  const body: Record<string, unknown> = {
    mode: 'FULL',
    avatar_id: avatarId || SANDBOX_AVATAR_ID,
  };

  if (useVoiceAgent) {
    body.voice_agent = { id: voiceAgentId, language: 'en' };
  } else {
    body.avatar_persona = { language: 'en' };

    if (voiceId && !(await configuredVoiceExists(apiKey, voiceId))) {
      return NextResponse.json(
        { error: `VOICE_ID ${voiceId} was not found in LiveAvatar` },
        { status: 400 }
      );
    }

    if (voiceId) {
      (body.avatar_persona as Record<string, unknown>).voice_id = voiceId;
    }
  }

  if (isSandbox) {
    body.is_sandbox = true;
    body.avatar_id = SANDBOX_AVATAR_ID;
  }

  if (useHeyGenContext) {
    (body.avatar_persona as Record<string, unknown>).context_id = contextId;
  }

  // Fire-and-forget, in parallel with the token request: prepare whichever app-owned
  // brain will answer before the shopper asks the first question.
  if (brain === 'local') void warmUpModel();
  if (brain === 'redis') void refreshAvatarContextCache().catch((err) => console.warn('[redis] context warm-up failed', err));

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
  const avatarDetail = useVoiceAgent
    ? `voice agent ${voiceAgentId}`
    : isSandbox
      ? 'sandbox avatar'
      : `avatar ${avatarId}`;

  await recordActivity({
    event: 'LiveAvatar token issued',
    kind: LogKind.SESSION,
    model: 'liveavatar',
    latencyMs: Date.now() - startedAt,
    detail: `${brain} brain · ${avatarDetail}`,
  });

  // `brain` is additive — the client reads it to decide whether to answer questions
  // itself, so the mode is decided in one place rather than configured twice.
  return NextResponse.json({ session_token: data.session_token, brain });
}

export async function DELETE(request: Request) {
  const { apiKey } = liveAvatarConfig();
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
