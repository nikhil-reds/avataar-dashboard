import { createHash } from 'node:crypto';
import type { PersonaSettings } from '@/types';
import { prisma } from './db';
import { redisStrictCommand } from './redis';
import { contextPrompt, heygenRequest, publishedVoiceSettings, RESPONSE_STYLE } from './heygenContext';

export const PUBLISHED_PERSONA_KEY = 'avatar:persona:published:v1';
export interface PublishedPersona {
  openingIntro: string;
  persona: string;
  instructions: string;
  version: string;
  publishedAt: string;
  savedAt: string;
  contextId?: string;
  contentHash?: string;
  catalogueCount?: number;
  sourceCount?: number;
  excludedSources?: { id: string; title: string; reason: string }[];
  avatarPersona?: Record<string, unknown>;
}
export async function getPublishedPersona(): Promise<PublishedPersona | null> {
  const raw = await redisStrictCommand<string | null>(['GET', PUBLISHED_PERSONA_KEY]);
  return raw ? JSON.parse(raw) as PublishedPersona : null;
}
export async function publicationContent(settings: PersonaSettings) {
  const [rows, catalogue] = await prisma.$transaction([prisma.ingestSource.findMany({
      orderBy: { id: 'asc' }, select: { id: true, title: true, text: true, status: true },
  }), prisma.productSku.findMany({ orderBy: { id: 'asc' }, select: {
    id: true, sku: true, name: true, category: true, price: true, weight: true, makingCharge: true, stock: true, supplier: true, talkingPoints: true, state: true,
  } })]);
    const sources = rows.filter(row => row.status !== 'FAILED' && row.text?.trim())
      .map(row => ({ id: row.id, title: row.title, text: row.text! }));
    const excludedSources = rows.filter(row => row.status === 'FAILED' || !row.text?.trim())
      .map(row => ({ id: row.id, title: row.title, reason: row.status === 'FAILED' ? 'Ingest failed' : 'Text extraction required' }));
  const content = { responseStyle: RESPONSE_STYLE, openingIntro: settings.openingIntro, persona: settings.persona, instructions: settings.instructions, sources, excludedSources, catalogue };
  const contentHash = createHash('sha256').update(JSON.stringify(content)).digest('hex');
  return { ...content, contentHash };
}

export async function publishPersona(settings: PersonaSettings): Promise<PublishedPersona> {
  const lock = crypto.randomUUID();
  const locked = await redisStrictCommand(['SET', 'avatar:publish:lock', lock, 'NX', 'EX', 120]);
  if (locked !== 'OK') throw new Error('Another publication is in progress. Please retry shortly.');
  try {
    const { sources, excludedSources, catalogue, contentHash } = await publicationContent(settings);
    const avatarPersona = await publishedVoiceSettings();
    const prompt = contextPrompt(settings, sources) + '\n\nCATALOGUE\nOnly LIVE products are approved for customer recommendations. Other states are unpublished and must not be offered.\n' + JSON.stringify(catalogue);
    // Content-addressed snapshots allow safe retries without changing a live context.
/* step 3 initialization */
