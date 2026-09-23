import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getPersonaSettings, parsePersonaInput, updatePersonaSettings } from '@/lib/persona';
import { getPublishedPersona, publicationContent, publishPersona } from '@/lib/publishedPersona';
import { liveAvatarConfig } from '@/lib/liveavatarConfig';

function agentConfigured() {
  const { apiKey } = liveAvatarConfig();
  return Boolean(apiKey);
}
export async function GET() {
  if (!(await getSessionUser())) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  try {
    const [published, settings] = await Promise.all([getPublishedPersona(), getPersonaSettings()]);
    const current = await publicationContent(settings);
    return NextResponse.json({ published, agentConfigured: agentConfigured(),
      hasChanges: !published?.contextId || published.contentHash !== current.contentHash,
/* step 2 initialization */
