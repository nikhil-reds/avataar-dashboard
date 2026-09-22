import { Prisma } from '@/app/generated/prisma';
import { prisma } from './db';
import type { KnowledgeInput, KnowledgePatch } from './validation';

/**
 * Storage layer for the avatar knowledge base.
 *
 * This module only reads and writes rows. Deciding *which* rows answer a question lives
 * in `lib/knowledgeRetrieval.ts`, and turning them into a prompt lives in
 * `lib/knowledgePrompt.ts`. Keeping the three apart is what lets retrieval be swapped for
 * embeddings later without touching the admin CRUD or the chat route.
 */

export const KNOWLEDGE_PAGE_SIZE = 100;

export type KnowledgeStatusFilter = 'all' | 'active' | 'inactive';

export interface KnowledgeQuery {
  q?: string;
  category?: string;
  status?: KnowledgeStatusFilter;
  limit?: number;
  skip?: number;
}

function buildWhere(query: KnowledgeQuery): Prisma.AvatarKnowledgeWhereInput {
  const where: Prisma.AvatarKnowledgeWhereInput = {};

  if (query.status === 'active') where.isActive = true;
  if (query.status === 'inactive') where.isActive = false;

  if (query.category) where.category = query.category.toLowerCase();

  const q = query.q?.trim();
  if (q) {
    const contains = { contains: q, mode: Prisma.QueryMode.insensitive };
    where.OR = [
      { title: contains },
      { content: contains },
      { category: contains },
      { source: contains },
      // `has` is an exact array-element match, so this only fires when the search term is
      // a whole keyword. The `contains` clauses above cover partial words.
      { keywords: { has: q.toLowerCase() } },
    ];
  }

  return where;
}

export async function listKnowledge(query: KnowledgeQuery = {}) {
  const where = buildWhere(query);
  const take = Math.min(Math.max(query.limit ?? KNOWLEDGE_PAGE_SIZE, 1), KNOWLEDGE_PAGE_SIZE);

  const [rows, total, matching] = await Promise.all([
    prisma.avatarKnowledge.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take,
      skip: Math.max(query.skip ?? 0, 0),
    }),
    prisma.avatarKnowledge.count(),
    prisma.avatarKnowledge.count({ where }),
  ]);

  return { rows, total, matching };
}

export type KnowledgeRecord = Awaited<ReturnType<typeof listKnowledge>>['rows'][number];

/** Distinct categories in use, for the admin filter. */
export async function listKnowledgeCategories(): Promise<string[]> {
  const rows = await prisma.avatarKnowledge.findMany({
    where: { category: { not: null } },
    distinct: ['category'],
    select: { category: true },
    orderBy: { category: 'asc' },
  });

  return rows.map((row) => row.category).filter((c): c is string => Boolean(c));
}

export function getKnowledge(id: string) {
  return prisma.avatarKnowledge.findUnique({ where: { id } });
}

export function createKnowledge(input: KnowledgeInput) {
  return prisma.avatarKnowledge.create({ data: input });
}

export function updateKnowledge(id: string, patch: KnowledgePatch) {
  return prisma.avatarKnowledge.update({ where: { id }, data: patch });
}

/**
 * Soft delete. The row stops reaching the avatar immediately (retrieval reads active rows
 * only) but stays visible in the admin list, so a mistaken delete is one click to undo.
 */
export function deactivateKnowledge(id: string) {
  return prisma.avatarKnowledge.update({ where: { id }, data: { isActive: false } });
}

/** Irreversible. Only reached via `?hard=true`. */
export function destroyKnowledge(id: string) {
  return prisma.avatarKnowledge.delete({ where: { id } });
}
