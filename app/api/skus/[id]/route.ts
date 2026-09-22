import { NextResponse } from 'next/server';
import { LogKind, LogStatus, Prisma } from '@/app/generated/prisma';
import { prisma } from '@/lib/db';
import { recordActivity } from '@/lib/activity';
import { KEYS, del as cacheDel } from '@/lib/redis';

/**
 * Remove a product from the catalogue.
 *
 * The row is the only thing that makes a product speakable by the avatar, so deleting
 * it is the supported way to take a product off the floor. There is no soft-delete:
 * `state` already covers "not live yet".
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const deleted = await prisma.productSku.delete({
      where: { id },
      select: { id: true, sku: true, name: true },
    });

    await recordActivity({
      event: `Catalogue entry deleted: ${deleted.sku}`,
      kind: LogKind.INGEST,
      model: 'admin',
      detail: deleted.name,
    });
    await cacheDel(KEYS.catalogueIndex());

    return NextResponse.json({ deleted: deleted.id, sku: deleted.sku });
  } catch (err) {
    // P2025: the row was already gone — a double-click, or two operators at once.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    console.error('[catalogue] delete failed', id, err);

    await recordActivity({
      event: 'Catalogue entry delete failed',
      kind: LogKind.INGEST,
      status: LogStatus.ERROR,
      model: 'admin',
      detail: id,
    });

    return NextResponse.json({ error: 'Could not delete the product' }, { status: 500 });
  }
}
