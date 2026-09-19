import { NextResponse } from 'next/server';
import { getIndexBuild } from '@/lib/ingest';

/**
 * One stored build, rehydrated into the same JSON the build request returned — so a
 * consumer can re-fetch an index by id instead of keeping the response around.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const index = await getIndexBuild(id);

  if (!index) {
    return NextResponse.json({ error: 'Build not found' }, { status: 404 });
  }

  return NextResponse.json(index);
}
