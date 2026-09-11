import { Header } from '@/components/layout/Header';
import { ConversationFilters } from '@/components/conversations/ConversationFilters';
import { ConversationTable } from '@/components/conversations/ConversationTable';
import { TranscriptPanel } from '@/components/conversations/TranscriptPanel';
import { Pagination } from '@/components/conversations/Pagination';
import { TAB_BY_ID } from '@/data/navigation';
import { getConversation, listConversations } from '@/lib/conversations';
import { parseConversationQuery, type RawSearchParams } from '@/lib/conversationQuery';

// Every render depends on the query string and live database rows.
export const dynamic = 'force-dynamic';

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const raw = await searchParams;
  const query = parseConversationQuery(raw);
  const selectedId = single(raw.selected) || null;

  const [list, selected] = await Promise.all([
    listConversations(query),
    selectedId ? getConversation(selectedId) : Promise.resolve(null),
  ]);

  return (
    <>
      <Header activeTabDef={TAB_BY_ID.conversations} />

      <div className="p-8 pb-16 flex flex-col gap-6 max-w-7xl">
        <ConversationFilters
          q={query.q}
          status={query.status}
          from={single(raw.from)}
          to={single(raw.to)}
          minTurns={query.minTurns}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-6 items-start">
          <div className="flex flex-col gap-4">
            <ConversationTable
              rows={list.rows}
              query={query}
              selectedId={selectedId}
              total={list.total}
            />
            <Pagination
              query={query}
              pageCount={list.pageCount}
              total={list.total}
              perPage={list.perPage}
              selectedId={selectedId}
            />
          </div>

          <TranscriptPanel session={selected} />
        </div>
      </div>
    </>
  );
}
