import { Prisma } from '@prisma/client';
import { prisma } from './db';

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
