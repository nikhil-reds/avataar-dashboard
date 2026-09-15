import { Header } from '@/components/layout/Header';
import { ExtractionQueue } from '@/components/ingest/ExtractionQueue';
import { ReviewRows } from '@/components/ingest/ReviewRows';
import { TAB_BY_ID } from '@/data/navigation';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function IngestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const selectedId = ((Array.isArray(raw.job) ? raw.job[0] : raw.job) ?? '').trim();

  const jobs = await prisma.ingestJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 40,
  });

  const activeJob =
    jobs.find((job) => job.id === selectedId) ?? jobs[0] ?? null;

  const rows = activeJob
    ? await prisma.extractedRow.findMany({
        where: { jobId: activeJob.id },
        orderBy: { createdAt: 'asc' },
      })
    : [];

  return (
    <>
      <Header activeTabDef={TAB_BY_ID.ingest} />

      <div className="p-8 pb-16 flex flex-col gap-6 max-w-7xl">
        <div className="font-mono text-[10.5px] tracking-widest uppercase text-zinc-400 font-semibold flex items-center gap-1.5 mb-2">
          <span>apps</span>
          <span>/</span>
          <span className="text-indigo-600 dark:text-indigo-400 font-bold">
            {TAB_BY_ID.ingest.crumb}
          </span>
        </div>
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
          No PDF extraction worker is configured, so nothing populates this queue yet.
          The tables below read from the database and will fill once a worker writes
          ingest jobs and extracted rows.
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr] gap-6 items-start">
          <ExtractionQueue jobs={jobs} selectedJobId={activeJob?.id ?? null} />
          <ReviewRows rows={rows} job={activeJob} />
        </div>
      </div>
    </>
  );
}

