// Pure LiveAvatar configuration resolution — no Next, no Prisma, no network.
// Kept separate from the route so the precedence rules can be reasoned about
// and exercised on their own.

// Free sandbox avatar — last resort only, when no avatar and no context are configured.
export const SANDBOX_AVATAR_ID = 'dd73ea75-1218-4ef3-92ce-606d5f7fbc0a';

export type AvatarSource =
  | 'LIVEAVATAR_AVATAR_ID'
  | 'LIVEAVATAR_CONTEXT_ID'
  | 'sandbox-default';

export interface AvatarConfig {
  source: AvatarSource;
  avatarId: string;
  contextId: string | null;
  isSandbox: boolean;
}

/**
 * Read an env var the way a hand-edited `.env` tends to supply it: surrounding
 * quotes, stray whitespace and empty assignments all count as "not configured",
 * so a blank `LIVEAVATAR_AVATAR_ID=` can never masquerade as a real avatar.
 */
export function readEnv(
  name: string | string[],
  env: NodeJS.ProcessEnv = process.env
): string | null {
  const names = Array.isArray(name) ? name : [name];
  for (const candidate of names) {
    const raw = env[candidate];
    if (typeof raw !== 'string') continue;

    const trimmed = raw.trim().replace(/^["']|["']$/g, '').trim();
    if (trimmed.length > 0) return trimmed;
  }

  return null;
}

/**
 * Explicit configuration wins:
 *
 *   LIVEAVATAR_AVATAR_ID  → use that avatar, never sandbox
 *   LIVEAVATAR_CONTEXT_ID → use the context configuration
 *   neither               → sandbox default
 *
 * The sandbox avatar is only ever substituted when nothing is configured. It
 * must never override a real LIVEAVATAR_AVATAR_ID.
 */
export function resolveAvatarConfig(
  env: NodeJS.ProcessEnv = process.env
): AvatarConfig {
  const avatarId = readEnv(['LIVEAVATAR_AVATAR_ID', 'AVTAAR_ID', 'AVATAR_ID'], env);
  const contextId = readEnv('LIVEAVATAR_CONTEXT_ID', env);

  if (avatarId) {
    return {
      source: 'LIVEAVATAR_AVATAR_ID',
      avatarId,
      contextId,
      isSandbox: false,
    };
  }

  if (contextId) {
    return {
      source: 'LIVEAVATAR_CONTEXT_ID',
      avatarId: SANDBOX_AVATAR_ID,
      contextId,
      isSandbox: true,
    };
  }

  return {
    source: 'sandbox-default',
    avatarId: SANDBOX_AVATAR_ID,
    contextId: null,
    isSandbox: true,
  };
}

export interface AvatarConfigSummary {
  avatarSource: AvatarSource;
  avatarConfigured: boolean;
  contextConfigured: boolean;
  sandbox: boolean;
  mode: 'FULL' | 'LITE';
}

/**
 * Safe diagnostics: which branch was taken and what is configured. Deliberately
 * excludes the API key, session token and signed WebSocket URL.
 */
export function summarizeAvatarConfig(
  config: AvatarConfig,
  mode: 'FULL' | 'LITE'
): AvatarConfigSummary {
  return {
    avatarSource: config.source,
    avatarConfigured: config.source === 'LIVEAVATAR_AVATAR_ID',
    contextConfigured: Boolean(config.contextId),
    sandbox: config.isSandbox,
    mode,
  };
}

export function formatAvatarConfigLog(summary: AvatarConfigSummary): string {
  return (
    `LiveAvatar configuration: avatar source = ${summary.avatarSource}, ` +
    `avatar configured = ${summary.avatarConfigured}, ` +
    `context configured = ${summary.contextConfigured}, ` +
    `sandbox = ${summary.sandbox}, mode = ${summary.mode}`
  );
}

export const liveAvatarConfig = (env: NodeJS.ProcessEnv = process.env) => ({
  apiKey: readEnv(['LIVEAVATAR_API_KEY', 'API_KEY'], env),
  avatarId: readEnv(['LIVEAVATAR_AVATAR_ID', 'AVTAAR_ID', 'AVATAR_ID'], env),
  contextId: readEnv('LIVEAVATAR_CONTEXT_ID', env),
  voiceId: readEnv(['LIVEAVATAR_VOICE_ID', 'VOICE_ID'], env),
  voiceAgentId: readEnv(['LIVEAVATAR_VOICE_AGENT_ID', 'VOICE_AGENT_ID'], env),
});
