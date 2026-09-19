import { NextResponse } from 'next/server';
import { LogKind, LogStatus } from '@prisma/client';
import { recordActivity } from '@/lib/activity';
import {
  formatAvatarConfigLog,
  readEnv,
  resolveAvatarConfig,
  summarizeAvatarConfig,
} from '@/lib/liveavatarConfig';

const API_BASE = 'https://api.liveavatar.com';

export async function POST(request: Request) {
  const apiKey = process.env.LIVEAVATAR_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'LIVEAVATAR_API_KEY not configured' }, { status: 500 });
  }

  let requestedMode: 'FULL' | 'LITE' = 'FULL';
  try {
    const body = await request.json();
    if (body?.mode === 'LITE') requestedMode = 'LITE';
  } catch {
    // Existing callers send no body; keep that path as FULL mode.
  }

  const config = resolveAvatarConfig();
  const { source, avatarId, contextId, isSandbox } = config;

  const body: Record<string, unknown> = {
    mode: requestedMode,
    avatar_id: avatarId,
    avatar_persona: { language: 'en' },
  };

  if (requestedMode === 'LITE' && readEnv('LIVEAVATAR_AUDIO_API_KEY')) {
    body.audio = { api_key: readEnv('LIVEAVATAR_AUDIO_API_KEY') };
  }

  if (isSandbox) {
    body.is_sandbox = true;
  }

  if (contextId) {
    (body.avatar_persona as Record<string, unknown>).context_id = contextId;
  }

  const configSummary = summarizeAvatarConfig(config, requestedMode);
  console.info(formatAvatarConfigLog(configSummary));

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
    detail: `${requestedMode.toLowerCase()} · avatar source ${source} · sandbox ${isSandbox} · context ${Boolean(
      contextId
    )}`,
  });

  return NextResponse.json({
    session_token: data.session_token,
    mode: requestedMode,
    config: configSummary,
  });
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
