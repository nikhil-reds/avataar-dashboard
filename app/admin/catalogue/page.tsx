import { Header } from '@/components/layout/Header';
import { CatalogueSearch } from '@/components/catalogue/CatalogueSearch';
import { CatalogueTable } from '@/components/catalogue/CatalogueTable';
import { SkuDetailPanel } from '@/components/catalogue/SkuDetailPanel';
import { TAB_BY_ID, tabMetadata } from '@/data/navigation';
import { getSku, listSkus } from '@/lib/catalogue';

export const metadata = tabMetadata('catalogue');

export const dynamic = 'force-dynamic';

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const q = ((Array.isArray(raw.q) ? raw.q[0] : raw.q) ?? '').trim().slice(0, 200);
  const selectedId = ((Array.isArray(raw.selected) ? raw.selected[0] : raw.selected) ?? '').trim();

  const [{ rows, total, matching }, selected] = await Promise.all([
    listSkus(q),
    // A stale or hand-edited id resolves to null and the list simply renders without
    // the panel, rather than the page failing.
    selectedId ? getSku(selectedId) : Promise.resolve(null),
  ]);

  const closeHref = q ? `/admin/catalogue?q=${encodeURIComponent(q)}` : '/admin/catalogue';

  return (
    <>
      <Header activeTabDef={TAB_BY_ID.catalogue} ctaHref={TAB_BY_ID.manual.href} />

      <div className="p-4 sm:p-6 lg:p-8 pb-16 flex flex-col gap-5 sm:gap-6 max-w-7xl">
        <div className="font-mono text-[10.5px] tracking-widest uppercase text-zinc-400 font-semibold flex items-center gap-1.5 mb-2">
          <span>apps</span>
          <span>/</span>
          <span className="text-indigo-600 dark:text-indigo-400 font-bold">
            {TAB_BY_ID.catalogue.crumb}
          </span>
        </div>
        <div className="flex flex-col gap-3">
          <CatalogueSearch searchQuery={q} matching={matching} total={total} />
          <CatalogueTable
            skus={rows}
            hasQuery={Boolean(q)}
            searchQuery={q}
            selectedId={selected?.id ?? null}
          />
        </div>
      </div>

      {selected && <SkuDetailPanel sku={selected} closeHref={closeHref} />}
    </>
  );
}

