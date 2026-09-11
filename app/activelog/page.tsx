import { Header } from '../../components/layout/Header';
import { LogFilters } from '../../components/logs/LogFilters';
import { LogTable } from '../../components/logs/LogTable';
import { TraceDetail } from '../../components/logs/TraceDetail';
import { TAB_BY_ID } from '../../data/navigation';
import { listActivity, LOG_KIND_FILTERS, type LogKindFilter } from '../../lib/activity';

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
  const selected = records.find((record) => record.id === selectedId) ?? records[0] ?? null;

  return (
    <>
      <Header activeTabDef={TAB_BY_ID.logs} />

      <div className="p-8 pb-16 flex flex-col gap-6 max-w-7xl">
        <div className="flex flex-col gap-4">
          <LogFilters kind={kind} searchQuery={q} />

          <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-6 items-start">
            <LogTable
              records={records}
              selectedId={selected?.id ?? null}
              kind={kind}
              searchQuery={q}
            />
            <TraceDetail record={selected} />
          </div>
        </div>
      </div>
    </>
  );
}
