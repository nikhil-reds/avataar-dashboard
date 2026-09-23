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
/* step 2 initialization */
