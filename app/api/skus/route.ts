import { NextResponse } from 'next/server';
import { LogKind, LogStatus, Prisma, SkuState } from '@/app/generated/prisma';
import { prisma } from '@/lib/db';
import { recordActivity } from '@/lib/activity';
import { refreshAvatarContextCache } from '@/lib/avatarContextCache';
import { parseSkuInput } from '@/lib/validation';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = parseSkuInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const input = parsed.value;

  try {
    const created = await prisma.productSku.create({
      data: {
        sku: input.sku,
        name: input.name,
        category: input.category,
        price: new Prisma.Decimal(input.price),
        stock: input.stock,
        supplier: input.supplier,
        talkingPoints: input.talkingPoints,
        source: 'Manual',
        // Manually entered rows go live directly; extracted rows are the ones that
        // need a human verdict first.
        state: SkuState.LIVE,
      },
      select: { id: true, sku: true, name: true },
    });

    await recordActivity({
      event: `Catalogue entry added: ${created.sku}`,
      kind: LogKind.INGEST,
      model: 'manual',
      detail: created.name,
    });
    void refreshAvatarContextCache().catch((err) => console.warn('[redis] context refresh failed', err));

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json(
        { error: `SKU "${input.sku}" already exists in the catalogue` },
        { status: 409 }
      );
    }

    await recordActivity({
      event: 'Catalogue entry failed',
      kind: LogKind.INGEST,
      status: LogStatus.ERROR,
      model: 'manual',
      detail: input.sku,
    });

    return NextResponse.json({ error: 'Could not save the product' }, { status: 500 });
  }
}
