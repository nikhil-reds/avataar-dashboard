import Link from 'next/link';
import { Header } from '../../components/layout/Header';
import { SessionList } from '../../components/memory/SessionList';
import { TranscriptView } from '../../components/memory/TranscriptView';
import { RetainedFacts } from '../../components/memory/RetainedFacts';
import { TAB_BY_ID } from '../../data/navigation';
import { prisma } from '../../lib/db';
import { getConversation } from '../../lib/conversations';

export const dynamic = 'force-dynamic';

const RECENT_LIMIT = 40;

export default async function MemoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const selectedId = ((Array.isArray(raw.selected) ? raw.selected[0] : raw.selected) ?? '').trim();

  const sessions = await prisma.shopperSession.findMany({
    orderBy: { startedAt: 'desc' },
    take: RECENT_LIMIT,
    select: {
      id: true,
      title: true,
      summary: true,
      status: true,
      startedAt: true,
      turnCount: true,
      expiresAt: true,
    },
  });

  const activeId = selectedId || sessions[0]?.id || null;
  const active = activeId ? await getConversation(activeId) : null;

  return (
    <>
      <Header activeTabDef={TAB_BY_ID.memory} />

      <div className="p-8 pb-16 flex flex-col gap-6 max-w-7xl">
        {sessions.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-10 text-center flex flex-col gap-2">
            <div className="text-sm font-semibold text-zinc-900 dark:text-white">
              No conversations recorded yet
            </div>
            <div className="text-xs text-zinc-500">
              Start an avatar session and its transcript will appear here.{' '}
              <Link href="/" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                Open the avatar
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
            <SessionList sessions={sessions} selectedId={activeId} />

            <div className="flex flex-col gap-6">
              <TranscriptView session={active} />
              <RetainedFacts facts={active?.facts ?? []} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
