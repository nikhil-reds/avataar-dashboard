import { Header } from '@/components/layout/Header';
import { LogFilters } from '@/components/logs/LogFilters';
import { LogTable } from '@/components/logs/LogTable';
import { LogPagination } from '@/components/logs/LogPagination';
import { TraceDetail } from '@/components/logs/TraceDetail';
import { BackToList } from '@/components/layout/BackToList';
import { TAB_BY_ID, tabMetadata } from '@/data/navigation';
import { listActivity } from '@/lib/activity';
import { buildLogSearch, isFiltered, parseLogQuery } from '@/lib/logQuery';

export const metadata = tabMetadata('logs');

export const dynamic = 'force-dynamic';

export default async function ActiveLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const query = parseLogQuery(raw);
  const selectedId = ((Array.isArray(raw.selected) ? raw.selected[0] : raw.selected) ?? '').trim();

  const { rows, total, matching, pageCount } = await listActivity(query);

  const filtered = isFiltered(query);

  // Below `md` the page shows the list or the trace, not both. Keyed off the raw
  // param rather than `selected`, which falls back to the first row.
  const hasSelection = Boolean(selectedId);
  const backHref = TAB_BY_ID.logs.href + buildLogSearch(query, { selected: null });

  const selected = rows.find((record) => record.id === selectedId) ?? rows[0] ?? null;

  return (
    <>
      <Header activeTabDef={TAB_BY_ID.logs} />

      <div className="p-4 sm:p-6 lg:p-8 pb-16 flex flex-col gap-5 sm:gap-6 max-w-7xl">
        <div className="font-mono text-[10.5px] tracking-widest uppercase text-zinc-400 font-semibold flex items-center gap-1.5 mb-2">
          <span>apps</span>
          <span>/</span>
          <span className="text-indigo-600 dark:text-indigo-400 font-bold">
            {TAB_BY_ID.logs.crumb}
          </span>
        </div>
        <div className="flex flex-col gap-4">
          <LogFilters
            query={query}
            matching={matching}
            total={total}
            filtered={filtered}
          />

          <div className="grid grid-cols-1 xl:grid-cols-[1.55fr_1fr] gap-6 items-start">
            <div className={`flex flex-col gap-3 ${hasSelection ? 'hidden md:flex' : ''}`}>
              <LogTable
                records={rows}
                selectedId={selected?.id ?? null}
                query={query}
                filtered={filtered}
              />

              <LogPagination
                query={query}
                pageCount={pageCount}
                matching={matching}
                selectedId={selectedId || null}
              />
            </div>

            <div className={`flex flex-col gap-2 ${hasSelection ? '' : 'hidden md:flex'}`}>
              {hasSelection && <BackToList href={backHref} />}
              <TraceDetail record={selected} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
