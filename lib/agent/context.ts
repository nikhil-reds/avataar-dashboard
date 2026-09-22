import { prisma } from '@/lib/db';
import { getPersonaSettings } from '@/lib/persona';
import { KEYS, TTL, get as redisGet, remember, set as redisSet } from '@/lib/redis';

/**
 * Application context preparation.
 *
 * ## What this is, and what it is not
 *
 * This builds a compact, budgeted view of what the app knows that is relevant to one
 * utterance: persona, recent memory, matching catalogue rows, matching document
 * snippets. It does NOT call an LLM and does not assemble a prompt for one.
 *
 * With `AgentType.FULL`, HeyGen owns the LLM and the SDK exposes no per-turn context
 * injection — knowledge is bound at token-mint time via `avatar_persona` / `context_id`
 * on `POST /v1/sessions/token`. So this packet is currently used for diagnostics,
 * admin display and turn records, and is ready to feed whichever injection mechanism
 * the integration gains. See `docs` note in CONTEXT.md — it is not silently shipped
 * into a second LLM.
 */

const MAX_CATALOGUE = 3;
const MAX_SNIPPETS = 5;
const MAX_MEMORY_TURNS = 8;

/** Hard character budgets, applied per section and then to the whole packet. */
export const BUDGET = {
  persona: 1200,
  memory: 1600,
  catalogue: 1600,
  snippets: 2400,
  total: 7000,
} as const;

export interface MemoryTurn {
  who: 'SHOPPER' | 'AVATAR' | 'SYSTEM';
  text: string;
  at: string;
}

export interface CatalogueMatch {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  talkingPoints: string[];
}

export interface SnippetMatch {
  documentId: string;
  title: string;
  heading: string;
  preview: string;
}

export interface ContextPacket {
  persona: { id: string; persona: string; instructions: string };
  recentTurns: MemoryTurn[];
  catalogue: CatalogueMatch[];
  snippets: SnippetMatch[];
  /** Characters used per section after truncation — proves the budget was applied. */
  usage: { persona: number; memory: number; catalogue: number; snippets: number; total: number };
  cache: { persona: boolean; catalogue: boolean; pageIndex: boolean; query: boolean };
}

interface CachedCatalogueItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  supplier: string | null;
  talkingPoints: string[];
  stock: number;
}

interface CachedPageNode {
  documentId: string;
  title: string;
  heading: string;
  preview: string;
}

export function compact(text: string, limit: number): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > limit ? `${oneLine.slice(0, limit - 1)}…` : oneLine;
}

export function tokenize(text: string): string[] {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      // Short tokens are usually filler ("do", "is", "of") and only add noise — except
      // when they contain a digit, which in a fastener catalogue is the whole query:
      // "M6", "M8", "A2". Dropping those made every part code unsearchable.
      .filter((word) => word.length > 2 || (word.length >= 2 && /\d/.test(word)))
  );
}

function score(queryWords: Set<string>, haystack: string): number {
  const lower = haystack.toLowerCase();
  let total = 0;
  for (const word of queryWords) if (lower.includes(word)) total += 1;
  return total;
}

/**
 * Cache key for a query's retrieval result.
 *
 * Deliberately derived from the utterance ALONE. Nothing session- or shopper-specific
 * goes into this key or its value, because it is a global cache: mixing one shopper's
 * memory into it would serve that memory to the next shopper who asked a similar
 * question. Session memory is read separately, per session, and never cached here.
 */
export function queryHash(message: string): string {
  const normalized = compact(message.toLowerCase(), 240);
  return Buffer.from(normalized).toString('base64url').slice(0, 64);
}

async function cachedPersona() {
  return remember(KEYS.persona(), TTL.PERSONA, getPersonaSettings);
}

async function cachedCatalogue() {
  return remember<CachedCatalogueItem[]>(KEYS.catalogueIndex(), TTL.CATALOGUE, async () => {
    return prisma.productSku.findMany({
      where: { state: 'LIVE' },
      orderBy: { updatedAt: 'desc' },
      take: 200,
      select: {
        id: true,
        sku: true,
        name: true,
        category: true,
        supplier: true,
        talkingPoints: true,
        stock: true,
      },
    });
  });
}

async function cachedPageNodes() {
  return remember<CachedPageNode[]>(KEYS.pageIndexSummary(), TTL.PAGEINDEX, async () => {
    const latest = await prisma.pageIndexBuild.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (!latest) return [];

    const docs = await prisma.pageIndexDocument.findMany({
      where: { buildId: latest.id, status: 'INDEXED' },
      orderBy: { ordinal: 'asc' },
      select: {
        id: true,
        title: true,
        nodes: { orderBy: { ordinal: 'asc' }, select: { heading: true, preview: true } },
      },
    });

    return docs.flatMap((doc) =>
      doc.nodes.map((node) => ({
        documentId: doc.id,
        title: doc.title,
        heading: node.heading,
        preview: node.preview,
      }))
    );
  });
}

/** Append one turn to a session's rolling memory window. */
export async function appendSessionMemory(sessionId: string, turn: MemoryTurn): Promise<void> {
  const key = KEYS.sessionMemory(sessionId);
  const current = (await redisGet<MemoryTurn[]>(key)) ?? [];
  const next = [...current, turn].slice(-MAX_MEMORY_TURNS);
  await redisSet(key, next, TTL.SESSION_MEMORY);
}

export async function readSessionMemory(sessionId: string | null): Promise<MemoryTurn[]> {
  if (!sessionId) return [];
  return (await redisGet<MemoryTurn[]>(KEYS.sessionMemory(sessionId))) ?? [];
}

interface CachedRetrieval {
  catalogue: CatalogueMatch[];
  snippets: SnippetMatch[];
}

/**
 * Pure scoring step, exported so retrieval can be tested without a database.
 */
export function selectRelevant(
  message: string,
  catalogue: CachedCatalogueItem[],
  nodes: CachedPageNode[]
): CachedRetrieval {
  const queryWords = new Set(tokenize(message));

  const matchedCatalogue = catalogue
    .map((item) => ({
      item,
      s: score(
        queryWords,
        `${item.sku} ${item.name} ${item.category} ${item.supplier ?? ''} ${item.talkingPoints.join(' ')}`
      ),
    }))
    .filter((e) => e.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, MAX_CATALOGUE)
    .map(({ item }) => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      stock: item.stock,
      talkingPoints: item.talkingPoints,
    }));

  const matchedSnippets = nodes
    .map((node) => ({
      node,
      s: score(queryWords, `${node.title} ${node.heading} ${node.preview}`),
    }))
    .filter((e) => e.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, MAX_SNIPPETS)
    .map(({ node }) => node);

  return { catalogue: matchedCatalogue, snippets: matchedSnippets };
}

/** Apply the character budgets and report what each section actually consumed. */
export function applyBudget(
  persona: { id: string; persona: string; instructions: string },
  turns: MemoryTurn[],
  retrieval: CachedRetrieval
): Pick<ContextPacket, 'persona' | 'recentTurns' | 'catalogue' | 'snippets' | 'usage'> {
  const boundedPersona = {
    id: persona.id,
    persona: compact(persona.persona, BUDGET.persona / 2),
    instructions: compact(persona.instructions, BUDGET.persona / 2),
  };

  const recentTurns = turns.slice(-MAX_MEMORY_TURNS).map((t) => ({
    ...t,
    text: compact(t.text, Math.floor(BUDGET.memory / MAX_MEMORY_TURNS)),
  }));

  const catalogue = retrieval.catalogue.map((item) => ({
    ...item,
    talkingPoints: item.talkingPoints.map((p) =>
      compact(p, Math.floor(BUDGET.catalogue / (MAX_CATALOGUE * 3)))
    ),
  }));

  const snippets = retrieval.snippets.map((s) => ({
    ...s,
    preview: compact(s.preview, Math.floor(BUDGET.snippets / MAX_SNIPPETS)),
  }));

  const personaChars = boundedPersona.persona.length + boundedPersona.instructions.length;
  const memoryChars = recentTurns.reduce((n, t) => n + t.text.length, 0);
  const catalogueChars = catalogue.reduce(
    (n, c) => n + c.name.length + c.talkingPoints.join('').length,
    0
  );
  const snippetChars = snippets.reduce((n, s) => n + s.preview.length + s.heading.length, 0);

  return {
    persona: boundedPersona,
    recentTurns,
    catalogue,
    snippets,
    usage: {
      persona: personaChars,
      memory: memoryChars,
      catalogue: catalogueChars,
      snippets: snippetChars,
      total: personaChars + memoryChars + catalogueChars + snippetChars,
    },
  };
}

/**
 * Build the context packet for one utterance.
 *
 * Retrieval is cached globally by utterance; persona is cached globally; session
 * memory is read per session and never enters a shared key.
 */
export async function buildContext(
  message: string,
  sessionId: string | null
): Promise<ContextPacket> {
  const [personaResult, memory] = await Promise.all([
    cachedPersona(),
    readSessionMemory(sessionId),
  ]);

  const cacheKey = KEYS.queryContext(queryHash(message));
  const cachedRetrieval = await redisGet<CachedRetrieval>(cacheKey);

  let retrieval: CachedRetrieval;
  let catalogueHit = false;
  let pageIndexHit = false;

  if (cachedRetrieval) {
    retrieval = cachedRetrieval;
  } else {
    const [catalogueResult, nodesResult] = await Promise.all([
      cachedCatalogue(),
      cachedPageNodes(),
    ]);
    catalogueHit = catalogueResult.hit;
    pageIndexHit = nodesResult.hit;
    retrieval = selectRelevant(message, catalogueResult.value, nodesResult.value);
    await redisSet(cacheKey, retrieval, TTL.QUERY_CONTEXT);
  }

  const bounded = applyBudget(personaResult.value, memory, retrieval);

  return {
    ...bounded,
    cache: {
      persona: personaResult.hit,
      catalogue: catalogueHit,
      pageIndex: pageIndexHit,
      query: Boolean(cachedRetrieval),
    },
  };
}
