import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getPersonaSettings, parsePersonaInput, updatePersonaSettings } from '@/lib/persona';
import { getPublishedPersona, publicationContent, publishPersona } from '@/lib/publishedPersona';
import { liveAvatarConfig } from '@/lib/liveavatarConfig';

function agentConfigured() {
  const { apiKey } = liveAvatarConfig();
/* step 1 initialization */
