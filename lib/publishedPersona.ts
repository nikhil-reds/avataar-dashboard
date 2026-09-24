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

/**
 * LiveAvatar treats every `${name}` token in a context as a required session
 * variable. Derive those names from the immutable publication snapshot so callers
 * do not need one environment variable per prompt placeholder.
 */
export async function getPublishedDynamicVariables(
  published: PublishedPersona
): Promise<Record<string, string>> {
  const raw = await redisStrictCommand<string | null>([
    'GET',
    `avatar:publication:${published.version}`,
  ]);
  if (!raw) return {};

  const snapshot = JSON.parse(raw) as {
    prompt?: string;
    openingIntro?: string;
  };
  const names = new Set<string>();
  const placeholder = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

  for (const text of [snapshot.prompt, snapshot.openingIntro]) {
    if (!text) continue;
    for (const match of text.matchAll(placeholder)) names.add(match[1]);
  }

  return Object.fromEntries([...names].map((name) => [name, '']));
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
    const version = createHash('sha256').update(JSON.stringify({
      openingIntro: settings.openingIntro, prompt, sources, excludedSources, avatarPersona,
    })).digest('hex');
    const snapshotKey = `avatar:publication:${version}`;
    await redisStrictCommand(['SET', snapshotKey, JSON.stringify({
      ...settings, sources, excludedSources, catalogue, contentHash, prompt, version,
    })]);
    const contextKey = `${snapshotKey}:heygen`;
    let contextId = await redisStrictCommand<string | null>(['GET', contextKey]);
    if (!contextId) {
      const context = await heygenRequest('/contexts', {
        method: 'POST', body: JSON.stringify({
          name: `TR Dashboard ${version.slice(0, 16)}`, prompt, opening_text: settings.openingIntro,
        }),
      });
      if (typeof context.id !== 'string' || !context.id) throw new Error('HeyGen did not return a context ID.');
      contextId = context.id;
      await redisStrictCommand(['SET', contextKey, contextId]);
    }
    if (!contextId) throw new Error('HeyGen context is unavailable.');
    const published: PublishedPersona = {
      openingIntro: settings.openingIntro, persona: settings.persona, instructions: settings.instructions,
      version, publishedAt: new Date().toISOString(), savedAt: settings.updatedAt,
      contextId, contentHash, catalogueCount: catalogue.length, sourceCount: sources.length, excludedSources,
      avatarPersona: { ...avatarPersona, context_id: contextId },
    };
    // Activate only after Redis storage and HeyGen creation both succeed.
    await redisStrictCommand(['EVAL', "redis.call('SET', KEYS[1], ARGV[1]); redis.call('DEL', KEYS[2]); return 'OK'", 2, PUBLISHED_PERSONA_KEY, 'avatar:context:v2', JSON.stringify(published)]);
    return published;
  } finally {
    await redisStrictCommand(['EVAL', "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0", 1, 'avatar:publish:lock', lock]).catch(() => {});
  }
}
