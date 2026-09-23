import { liveAvatarConfig } from './liveavatarConfig';

const API = 'https://api.liveavatar.com/v1';
export async function heygenRequest(path: string, init: RequestInit = {}) {
  const { apiKey } = liveAvatarConfig();
  if (!apiKey) throw new Error('Configure the LiveAvatar API key before publishing.');
  const response = await fetch(`${API}${path}`, {
    ...init, headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(20000), cache: 'no-store',
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.data) {
    // Provider error bodies can echo the entire private prompt. Do not expose them.
    throw new Error(`HeyGen context request failed (${response.status}). Check your API access and context size, then retry.`);
  }
  return result.data;
}

export async function publishedVoiceSettings(): Promise<Record<string, unknown>> {
  const { voiceAgentId, voiceId } = liveAvatarConfig();
  if (!voiceAgentId) return { language: 'en', ...(voiceId ? { voice_id: voiceId } : {}) };
  const agent = await heygenRequest(`/voice_agents/${encodeURIComponent(voiceAgentId)}`);
  if (agent.agent_type !== 'liveavatar_agent') {
    throw new Error('Context publishing requires a HeyGen LiveAvatar agent. The configured external agent cannot accept this context.');
  }
  const config = agent.agent_configuration ?? {};
  // Supported inline FULL-mode fields; context_id is supplied by this publication.
  return Object.fromEntries(['voice_id', 'language', 'voice_settings', 'stt_config', 'llm_settings']
/* step 4 initialization */
