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
      sourceCount: current.sources.length, catalogueCount: current.catalogue.length,
    });
  } catch {
    return NextResponse.json({ error: 'Could not check publication status. Check the database and Redis.' }, { status: 503 });
  }
}
export async function POST(request: Request) {
  if (!(await getSessionUser())) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  let input;
  let useSaved = false;
  try {
    const body = await request.json();
    useSaved = body?.useSaved === true;
    if (!useSaved) input = parsePersonaInput(body);
  }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid settings' }, { status: 400 }); }
  let saved;
  try {
/* step 4 initialization */
