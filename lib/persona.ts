import { prisma } from '@/lib/db';
import type { PersonaSettings } from '@/types';

export const DEFAULT_PERSONA_KEY = 'default';

export const DEFAULT_PERSONA_SETTINGS = {
  openingIntro:
    'Hello, welcome to Trifast. I can help with fastener specifications, materials, stock and lead times.',
  persona:
    'A calm, knowledgeable Trifast product specialist who speaks clearly, asks useful follow-up questions and keeps answers practical for buyers and engineers.',
  instructions:
    'Answer from the approved catalogue and indexed supplier documents. Keep responses concise, confirm important part numbers, and avoid guessing when product data is missing.',
};

const LIMITS = {
  openingIntro: 600,
  persona: 1600,
  instructions: 3000,
} as const;

type PersonaInput = typeof DEFAULT_PERSONA_SETTINGS;

function cleanText(value: unknown, field: keyof PersonaInput): string {
  if (typeof value !== 'string') {
    throw new Error(`${field} must be text`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${field} is required`);
  }

  if (trimmed.length > LIMITS[field]) {
    throw new Error(`${field} must be ${LIMITS[field]} characters or fewer`);
  }

  return trimmed;
}

export function parsePersonaInput(body: unknown): PersonaInput {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid JSON body');
  }

  const input = body as Record<string, unknown>;
  return {
    openingIntro: cleanText(input.openingIntro, 'openingIntro'),
    persona: cleanText(input.persona, 'persona'),
    instructions: cleanText(input.instructions, 'instructions'),
  };
}

function toPersonaSettings(row: {
  id: string;
  openingIntro: string;
  persona: string;
  instructions: string;
  updatedAt: Date;
}): PersonaSettings {
  return {
    id: row.id,
    openingIntro: row.openingIntro,
    persona: row.persona,
    instructions: row.instructions,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getPersonaSettings(): Promise<PersonaSettings> {
  const [row] = await prisma.$queryRaw<
    Array<{
      id: string;
      openingIntro: string;
      persona: string;
      instructions: string;
      updatedAt: Date;
    }>
  >`
    INSERT INTO "avatar_personas" (
      "id",
      "key",
      "openingIntro",
      "persona",
      "instructions",
      "updatedAt"
    )
    VALUES (
      '00000000-0000-4000-8000-000000000001',
      ${DEFAULT_PERSONA_KEY},
      ${DEFAULT_PERSONA_SETTINGS.openingIntro},
      ${DEFAULT_PERSONA_SETTINGS.persona},
      ${DEFAULT_PERSONA_SETTINGS.instructions},
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("key") DO UPDATE SET "key" = EXCLUDED."key"
    RETURNING "id", "openingIntro", "persona", "instructions", "updatedAt"
  `;

  return toPersonaSettings(row);
}

export async function updatePersonaSettings(input: PersonaInput): Promise<PersonaSettings> {
  const [row] = await prisma.$queryRaw<
    Array<{
      id: string;
      openingIntro: string;
      persona: string;
      instructions: string;
      updatedAt: Date;
    }>
  >`
    INSERT INTO "avatar_personas" (
      "id",
      "key",
      "openingIntro",
      "persona",
      "instructions",
      "updatedAt"
    )
    VALUES (
      '00000000-0000-4000-8000-000000000001',
      ${DEFAULT_PERSONA_KEY},
      ${input.openingIntro},
      ${input.persona},
      ${input.instructions},
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("key") DO UPDATE SET
      "openingIntro" = EXCLUDED."openingIntro",
      "persona" = EXCLUDED."persona",
      "instructions" = EXCLUDED."instructions",
      "updatedAt" = CURRENT_TIMESTAMP
    RETURNING "id", "openingIntro", "persona", "instructions", "updatedAt"
  `;

  return toPersonaSettings(row);
}
