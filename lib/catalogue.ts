import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { formatStamp } from './conversationQuery';
import type { SkuDetail } from '../types';

export const SKU_PAGE_SIZE = 50;

export async function listSkus(q: string) {
  const where: Prisma.ProductSkuWhereInput = {};

  if (q) {
    const contains = { contains: q, mode: Prisma.QueryMode.insensitive };
    where.OR = [{ sku: contains }, { name: contains }, { category: contains }, { supplier: contains }];
  }

  const [rows, total, matching] = await Promise.all([
    prisma.productSku.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: SKU_PAGE_SIZE,
    }),
    prisma.productSku.count(),
    prisma.productSku.count({ where }),
  ]);

  return { rows, total, matching };
}

export type SkuRecord = Awaited<ReturnType<typeof listSkus>>['rows'][number];

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatPrice(price: Prisma.Decimal): string {
  return INR.format(Number(price));
}

/**
 * One product, for the detail sidebar. Fetched by id rather than picked out of the
 * listing so a link to a SKU still opens when the current filter excludes it.
 */
export async function getSku(id: string): Promise<SkuDetail | null> {
  const row = await prisma.productSku.findUnique({ where: { id } });
  if (!row) return null;

  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category,
    price: formatPrice(row.price),
    stock: row.stock,
    weight: row.weight,
    makingCharge: row.makingCharge,
    supplier: row.supplier,
    talkingPoints: row.talkingPoints,
    source: row.source,
    state: row.state,
    createdAt: formatStamp(row.createdAt),
    updatedAt: formatStamp(row.updatedAt),
  };
}
