import { NextResponse } from 'next/server';
import { LogKind, LogStatus } from '@prisma/client';

import { recordActivity } from '@/lib/activity';
import { KEYS, del as cacheDel } from '@/lib/redis';
import {
  getPersonaSettings,
  parsePersonaInput,
  updatePersonaSettings,
} from '@/lib/persona';

export async function GET() {
  const settings = await getPersonaSettings();
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let input: ReturnType<typeof parsePersonaInput>;
  try {
    input = parsePersonaInput(body);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid persona settings' },
      { status: 400 }
    );
  }

  try {
    const settings = await updatePersonaSettings(input);
    await cacheDel(KEYS.persona());
    await recordActivity({
      event: 'Avatar persona updated',
      kind: LogKind.SESSION,
      model: 'admin',
      detail: 'Opening intro, persona and instructions changed',
    });

    return NextResponse.json(settings);
  } catch {
    await recordActivity({
      event: 'Avatar persona update failed',
      kind: LogKind.SESSION,
      status: LogStatus.ERROR,
      model: 'admin',
    });

    return NextResponse.json(
      { error: 'Could not save persona settings' },
      { status: 500 }
    );
  }
}
