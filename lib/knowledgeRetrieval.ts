import { Prisma } from '@prisma/client';
import { prisma } from './db';

/**
 * Retrieval layer: picks the handful of knowledge rows that actually bear on a question.
 *
 * V1 is lexical — term matching in Postgres to get a bounded candidate set, then field-
 * weighted scoring in memory. It deliberately never loads the whole table: the candidate
 * query is capped, so a knowledge base of ten rows and one of ten thousand cost the same
 * per question.
 *
 * The upgrade path (pgvector, embeddings, a reranker, PDF or site-scraped chunks) is to
 * write a new function with the `KnowledgeRetriever` signature and point the chat route at
 * it. Nothing outside this file knows how relevance is decided.
 */

export interface RetrievedKnowledge {
  id: string;
  title: string | null;
  content: string;
  category: string | null;
  source: string | null;
  /** Higher is more relevant. Comparable within one result set only. */
  score: number;
}

export interface RetrievalOptions {
  /** Maximum records returned. */
  limit?: number;
  /** Total character budget across all returned content, to bound prompt size. */
  maxChars?: number;
}

export type KnowledgeRetriever = (
  question: string,
  options?: RetrievalOptions
) => Promise<RetrievedKnowledge[]>;

const DEFAULT_LIMIT = 6;
const DEFAULT_MAX_CHARS = 6_000;
/** How many rows the database is asked for before in-memory scoring narrows them down. */
const CANDIDATE_LIMIT = 60;
const MAX_TERMS = 12;

// Words that match nearly every row and so carry no signal about which row is relevant.
const STOPWORDS = new Set([
  'a', 'about', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'been', 'but',
  'by', 'can', 'could', 'did', 'do', 'does', 'for', 'from', 'get', 'give', 'had', 'has',
  'have', 'he', 'her', 'him', 'his', 'how', 'i', 'if', 'in', 'is', 'it', 'its', 'just',
  'know', 'like', 'me', 'much', 'my', 'no', 'not', 'of', 'on', 'or', 'our', 'out',
  'please', 'say', 'she', 'should', 'so', 'some', 'tell', 'than', 'that', 'the', 'their',
  'them', 'then', 'there', 'these', 'they', 'this', 'to', 'up', 'us', 'was', 'we', 'were',
  'what', 'when', 'where', 'which', 'who', 'why', 'will', 'with', 'would', 'you', 'your',
]);

// Field weights. A term in the keywords list was put there by a human specifically so the
// row would be found by it, which is a far stronger signal than the same term occurring
// somewhere in a long body of prose.
const WEIGHT_KEYWORD = 5;
const WEIGHT_TITLE = 3;
const WEIGHT_CATEGORY = 2;
const WEIGHT_CONTENT = 1;

/** Splits a question into the distinct terms worth searching on. */
export function extractTerms(question: string): string[] {
  const terms = question
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 1 && !STOPWORDS.has(term));

  return [...new Set(terms)].slice(0, MAX_TERMS);
}

/**
 * Scores one row against the question's terms. Each term counts once per field regardless
 * of how often it occurs, so a long rambling record cannot outrank a precise short one
 * just by repeating a word.
 */
function scoreRow(
  row: { title: string | null; content: string; category: string | null; keywords: string[] },
  terms: string[]
): number {
  const title = row.title?.toLowerCase() ?? '';
  const content = row.content.toLowerCase();
  const category = row.category?.toLowerCase() ?? '';
  const keywords = row.keywords.map((k) => k.toLowerCase());

  let score = 0;
  for (const term of terms) {
    if (keywords.some((keyword) => keyword === term || keyword.includes(term))) {
      score += WEIGHT_KEYWORD;
    }
    if (title.includes(term)) score += WEIGHT_TITLE;
    if (category.includes(term)) score += WEIGHT_CATEGORY;
    if (content.includes(term)) score += WEIGHT_CONTENT;
  }

  return score;
}

/** A stored row as ranking sees it. Kept structural so any future source can be ranked. */
export interface RankableRecord {
  id: string;
  title: string | null;
  content: string;
  category: string | null;
  source: string | null;
  keywords: string[];
  updatedAt: Date;
}

/**
 * Ranks candidate rows against a question's terms and applies both caps.
 *
 * Pure and exported: it holds the whole relevance decision with no database in it, so it
 * can be unit tested, and a future retriever that gets its candidates from pgvector or a
 * document store can reuse it unchanged.
 */
export function rankRecords(
  rows: RankableRecord[],
  terms: string[],
  limit: number,
  maxChars: number
): RetrievedKnowledge[] {
  // Ties on score fall back to recency, so the newest wording of a fact wins over an
  // older entry that scores identically.
  const ranked = rows
    .map((row) => ({ row, score: scoreRow(row, terms) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.row.updatedAt.getTime() - a.row.updatedAt.getTime())
    .slice(0, limit)
    .map(({ row, score }) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category,
      source: row.source,
      score,
    }));

  return withinBudget(ranked, maxChars);
}

/** Applies the character budget, truncating rather than returning nothing at all. */
function withinBudget(rows: RetrievedKnowledge[], maxChars: number): RetrievedKnowledge[] {
  const kept: RetrievedKnowledge[] = [];
  let used = 0;

  for (const row of rows) {
    const remaining = maxChars - used;
    if (remaining <= 0) break;

    if (row.content.length <= remaining) {
      kept.push(row);
      used += row.content.length;
      continue;
    }

    // The top-ranked record is worth including even if it has to be cut short; anything
    // further down is dropped instead, so the avatar never quotes a mangled tail.
    if (kept.length === 0) {
      kept.push({ ...row, content: `${row.content.slice(0, remaining)}…` });
    }
    break;
  }

  return kept;
}

/**
 * The most relevant active knowledge for a question.
 *
 * Returns the most recently updated records when the question carries no searchable terms
 * ("hi", "thanks"), so the avatar still has its general context to answer from.
 */
export const getRelevantKnowledge: KnowledgeRetriever = async (question, options = {}) => {
  const limit = Math.max(options.limit ?? DEFAULT_LIMIT, 1);
  const maxChars = Math.max(options.maxChars ?? DEFAULT_MAX_CHARS, 200);
  const terms = extractTerms(question ?? '');

  const select = {
    id: true,
    title: true,
    content: true,
    category: true,
    source: true,
    keywords: true,
    updatedAt: true,
  } as const;

  if (terms.length === 0) {
    const recent = await prisma.avatarKnowledge.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select,
    });

    return withinBudget(
      recent.map((row) => ({
        id: row.id,
        title: row.title,
        content: row.content,
        category: row.category,
        source: row.source,
        score: 0,
      })),
      maxChars
    );
  }

  const termFilters: Prisma.AvatarKnowledgeWhereInput[] = terms.flatMap((term) => {
    const contains = { contains: term, mode: Prisma.QueryMode.insensitive };
    return [{ title: contains }, { content: contains }, { category: contains }];
  });

  const candidates = await prisma.avatarKnowledge.findMany({
    where: {
      isActive: true,
      OR: [...termFilters, { keywords: { hasSome: terms } }],
    },
    // Newest first, so when more rows match than the cap allows it is the stale ones that
    // fall outside the candidate window.
    orderBy: { updatedAt: 'desc' },
    take: CANDIDATE_LIMIT,
    select,
  });

  return rankRecords(candidates, terms, limit, maxChars);
};
