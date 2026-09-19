import { Header } from '@/components/layout/Header';
import { IngestStudio } from '@/components/ingest/IngestStudio';
import { TAB_BY_ID, tabMetadata } from '@/data/navigation';
import { latestIndexBuild, listSources } from '@/lib/ingest';

export const metadata = tabMetadata('ingest');

export const dynamic = 'force-dynamic';

export default async function IngestPage() {
  // Loaded on the server so the bench and the last index are on screen before any
  // client fetch runs.
  const [sources, latestIndex] = await Promise.all([listSources(), latestIndexBuild()]);

  return (
    <>
      <Header activeTabDef={TAB_BY_ID.ingest} ctaHref="/admin/ingest#add-source" />

      <div className="p-4 sm:p-6 lg:p-8 pb-16 flex flex-col gap-5 sm:gap-6 max-w-7xl">
        <div className="font-mono text-[10.5px] tracking-widest uppercase text-zinc-400 font-semibold flex items-center gap-1.5 mb-2">
          <span>apps</span>
          <span>/</span>
          <span className="text-indigo-600 dark:text-indigo-400 font-bold">
            {TAB_BY_ID.ingest.crumb}
          </span>
        </div>
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
          Uploaded files are stored on the server and indexed into the database. PDF and
          Word are kept whole but index as metadata only until an extraction worker can
          read them.
        </div>

        <IngestStudio initialSources={sources} initialIndex={latestIndex} />
      </div>
    </>
  );
}
