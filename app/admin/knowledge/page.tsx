import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { KnowledgeSearch } from '@/components/knowledge/KnowledgeSearch';
import { KnowledgeWorkbench } from '@/components/knowledge/KnowledgeWorkbench';
import { TAB_BY_ID, TAB_DEFINITIONS } from '@/data/navigation';
import { listKnowledge, listKnowledgeCategories, type KnowledgeStatusFilter } from '@/lib/knowledge';

// Rendered per request: an entry saved a second ago has to be on the page, and in the
// avatar's answers, without a rebuild.
export const dynamic = 'force-dynamic';

function first(value: string | string[] | undefined): string {
  return ((Array.isArray(value) ? value[0] : value) ?? '').trim();
}

export default async function KnowledgeAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const q = first(raw.q).slice(0, 200);
  const category = first(raw.category).slice(0, 80);
  const statusParam = first(raw.status);
  const status: KnowledgeStatusFilter =
    statusParam === 'active' || statusParam === 'inactive' ? statusParam : 'all';

  const [{ rows, total, matching }, categories] = await Promise.all([
    listKnowledge({ q, category, status }),
    listKnowledgeCategories(),
  ]);

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-zinc-900 dark:text-zinc-100 transition-colors">
      <Sidebar tabs={TAB_DEFINITIONS} />

      <main className="flex-1 min-w-0 flex flex-col">
        <Header activeTabDef={TAB_BY_ID.knowledge} />

        <div className="p-8 pb-16 flex flex-col gap-6 max-w-5xl">
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50 dark:bg-indigo-950/30 px-4 py-3 text-xs text-indigo-800 dark:text-indigo-200">
            Entries saved here are read from the database for every question the avatar is
            asked. No redeploy, no restart — the next question already uses them.
          </div>

          <KnowledgeSearch
            searchQuery={q}
            status={status}
            category={category}
            categories={categories}
            matching={matching}
            total={total}
          />

          <KnowledgeWorkbench rows={rows} hasQuery={Boolean(q || category || status !== 'all')} />
        </div>
      </main>
    </div>
  );
}
