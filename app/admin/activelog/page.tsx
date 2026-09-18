import { Header } from '@/components/layout/Header';
import { LogFilters } from '@/components/logs/LogFilters';
import { LogTable } from '@/components/logs/LogTable';
import { TraceDetail } from '@/components/logs/TraceDetail';
import { BackToList } from '@/components/layout/BackToList';
import { TAB_BY_ID, tabMetadata } from '@/data/navigation';
import { listActivity, LOG_KIND_FILTERS, type LogKindFilter } from '@/lib/activity';

export const metadata = tabMetadata('logs');

export const dynamic = 'force-dynamic';

function single(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}

export default async function ActiveLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;

  const kindRaw = single(raw.kind) as LogKindFilter;
  const kind = LOG_KIND_FILTERS.includes(kindRaw) ? kindRaw : 'all';
  const q = single(raw.q).slice(0, 200);
  const selectedId = single(raw.selected) || null;

  const records = await listActivity({ kind, q, limit: 200 });

  // Below `md` the page shows the list or the trace, not both. Keyed off the raw
  // param rather than `selected`, which falls back to the first row.
  const hasSelection = Boolean(selectedId);
  const backParams = new URLSearchParams();
  if (kind !== 'all') backParams.set('kind', kind);
  if (q) backParams.set('q', q);
  const backHref = TAB_BY_ID.logs.href + (backParams.size ? '?' + backParams : '');

  const selected = records.find((record) => record.id === selectedId) ?? records[0] ?? null;

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
          <LogFilters kind={kind} searchQuery={q} />

          <div className="grid grid-cols-1 xl:grid-cols-[1.55fr_1fr] gap-6 items-start">
            <div className={hasSelection ? 'hidden md:block' : ''}>
              <LogTable
                records={records}
                selectedId={selected?.id ?? null}
                kind={kind}
                searchQuery={q}
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

