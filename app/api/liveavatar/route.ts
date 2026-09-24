import { NextResponse } from 'next/server';
import { LogKind, LogStatus } from '@/app/generated/prisma';
import { recordActivity } from '@/lib/activity';
import {
  getPublishedDynamicVariables,
  getPublishedPersona,
} from '@/lib/publishedPersona';
import {
  formatAvatarConfigLog,
  liveAvatarConfig,
  resolveAvatarConfig,
  summarizeAvatarConfig,
} from '@/lib/liveavatarConfig';
import { publishedVoiceSettings } from '@/lib/heygenContext';

const API_BASE = 'https://api.liveavatar.com';

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
  const { apiKey, voiceId, voiceAgentId } = liveAvatarConfig();
  if (!apiKey) {
    return NextResponse.json({ error: 'LIVEAVATAR_API_KEY not configured' }, { status: 500 });
  }

  // HeyGen owns speech recognition, answer generation and voice.
  const brain = 'heygen';
  const requestedMode = 'FULL';

  const config = resolveAvatarConfig();
  const { source, avatarId, contextId, isSandbox } = config;
  let published;
  try { published = await getPublishedPersona(); }
  catch { return NextResponse.json({ error: 'Cannot read the published avatar context from Redis. Please retry.' }, { status: 503 }); }
  if (voiceAgentId && (!published?.contextId || !published.avatarPersona)) {
    return NextResponse.json(
      { error: 'No published avatar context is available. Publish the saved persona and catalogue before starting the avatar.' },
      { status: 409 }
    );
  }
  // The published context owns the intro and knowledge. A configured LiveAvatar
  // agent contributes its current voice/model settings to that inline persona.
  const usePublishedContext = Boolean(published?.contextId && published.avatarPersona);
  const useVoiceAgent = !usePublishedContext && Boolean(voiceAgentId);
  const useHeyGenContext = !usePublishedContext && Boolean(contextId) && !useVoiceAgent;

  const body: Record<string, unknown> = {
    mode: requestedMode,
    avatar_id: avatarId,
  };

  if (!useVoiceAgent && voiceId && !(await configuredVoiceExists(apiKey, voiceId))) {
    return NextResponse.json(
      { error: `LIVEAVATAR_VOICE_ID ${voiceId} was not found in LiveAvatar` },
      { status: 400 }
    );
  }

  if (usePublishedContext) {
    const agentSettings = voiceAgentId ? await publishedVoiceSettings() : {};
    body.avatar_persona = {
      ...published!.avatarPersona,
      ...agentSettings,
      context_id: published!.contextId,
      ...(voiceId ? { voice_id: voiceId } : {}),
    };
    const dynamicVariables = await getPublishedDynamicVariables(published!);
    if (Object.keys(dynamicVariables).length > 0) {
      body.dynamic_variables = dynamicVariables;
    }
  } else if (useVoiceAgent) {
    body.voice_agent = { id: voiceAgentId, language: 'en' };
  } else {
    body.avatar_persona = { language: 'en' };

    if (voiceId) {
      (body.avatar_persona as Record<string, unknown>).voice_id = voiceId;
    }
  }

  if (isSandbox) {
    body.is_sandbox = true;
  }

  if (useHeyGenContext) {
    (body.avatar_persona as Record<string, unknown>).context_id = contextId;
  }

  const configSummary = summarizeAvatarConfig({ ...config, contextId: published?.contextId ?? contextId }, requestedMode);
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
    detail: `${requestedMode.toLowerCase()} · avatar source ${source} · sandbox ${isSandbox} · context ${Boolean(
      published?.contextId ?? contextId
    )} · ${brain} brain · ${avatarDetail}`,
  });

  return NextResponse.json({
    session_token: data.session_token,
    brain,
    mode: requestedMode,
    config: configSummary,
  });
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
