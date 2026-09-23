import { Prisma, SkuState } from '@/app/generated/prisma';
import { prisma } from './db';
import { redisGet, redisSetEx } from './redis';
import { getPublishedPersona } from './publishedPersona';

const CONTEXT_KEY = 'avatar:context:v2';
const CONTEXT_TTL_SECONDS = 60 * 60;
const MAX_KNOWLEDGE_ROWS = 120;
const MAX_SKU_ROWS = 160;
const MAX_CONTENT_CHARS = 700;

export interface CachedKnowledge {
  id: string;
  title: string | null;
  category: string | null;
  content: string;
  keywords: string[];
}

export interface CachedSku {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: string;
  stock: number;
  supplier: string | null;
  talkingPoints: string[];
}

export interface AvatarContextSnapshot {
  persona: string;
  instructions: string;
  personaUpdatedAt: string;
  openingStatement: string;
  knowledge: CachedKnowledge[];
  catalogue: CachedSku[];
  refreshedAt: string;
}

export const FALLBACK_OPENING =
  'Hi, I am ready to help with product details, specifications, stock and lead times.';

function compact(text: string, max = MAX_CONTENT_CHARS) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > max ? `${normalized.slice(0, max - 1).trim()}…` : normalized;
}

export async function refreshAvatarContextCache(): Promise<AvatarContextSnapshot> {
  const [knowledgeRows, skuRows, settings, sourceRows] = await Promise.all([
    prisma.avatarKnowledge.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
      take: MAX_KNOWLEDGE_ROWS,
      select: {
        id: true,
        title: true,
        category: true,
/* progress step 2 */
  return opening?.content ? compact(opening.content, 220) : FALLBACK_OPENING;
}

export async function refreshAvatarContextCache(): Promise<AvatarContextSnapshot> {
  const [knowledgeRows, skuRows] = await Promise.all([
    prisma.avatarKnowledge.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
      take: MAX_KNOWLEDGE_ROWS,
      select: {
        id: true,
        title: true,
        category: true,
        content: true,
        keywords: true,
      },
    }),
    prisma.productSku.findMany({
      where: { state: { in: [SkuState.LIVE, SkuState.REVIEW] } },
      orderBy: { updatedAt: 'desc' },
      take: MAX_SKU_ROWS,
      select: {
        id: true,
        sku: true,
        name: true,
        category: true,
        price: true,
        stock: true,
        supplier: true,
        talkingPoints: true,
      },
    }),
  ]);

  const knowledge: CachedKnowledge[] = knowledgeRows.map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    content: compact(row.content),
    keywords: row.keywords,
  }));

  const snapshot: AvatarContextSnapshot = {
    persona: PERSONA,
    openingStatement: findOpening(knowledge),
    knowledge,
    catalogue: skuRows.map((row) => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      category: row.category,
      price: new Prisma.Decimal(row.price).toString(),
      stock: row.stock,
      supplier: row.supplier,
      talkingPoints: row.talkingPoints.map((point) => compact(point, 180)),
    })),
    refreshedAt: new Date().toISOString(),
  };

  await redisSetEx(CONTEXT_KEY, CONTEXT_TTL_SECONDS, JSON.stringify(snapshot));
  return snapshot;
}

export async function getAvatarContextSnapshot(): Promise<AvatarContextSnapshot> {
  const cached = await redisGet(CONTEXT_KEY).catch((err) => {
    console.warn('[redis] avatar context read failed', err);
    return null;
  });

  if (cached) {
    try {
      return JSON.parse(cached) as AvatarContextSnapshot;
    } catch (err) {
      console.warn('[redis] avatar context was invalid, rebuilding', err);
    }
  }

  return refreshAvatarContextCache();
}