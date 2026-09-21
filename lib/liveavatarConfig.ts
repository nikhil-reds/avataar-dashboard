const readEnv = (...names: string[]) => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
};

export const liveAvatarConfig = () => ({
  apiKey: readEnv('LIVEAVATAR_API_KEY', 'API_KEY'),
  avatarId: readEnv('LIVEAVATAR_AVATAR_ID', 'AVTAAR_ID', 'AVATAR_ID'),
  contextId: readEnv('LIVEAVATAR_CONTEXT_ID'),
  voiceId: readEnv('LIVEAVATAR_VOICE_ID', 'VOICE_ID'),
  voiceAgentId: readEnv('LIVEAVATAR_VOICE_AGENT_ID', 'VOICE_AGENT_ID'),
});
