import { Header } from '../../components/layout/Header';
import { CatalogueSearch } from '../../components/catalogue/CatalogueSearch';
import { CatalogueTable } from '../../components/catalogue/CatalogueTable';
import { TAB_BY_ID } from '../../data/navigation';
import { listSkus } from '../../lib/catalogue';

export const dynamic = 'force-dynamic';

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const q = ((Array.isArray(raw.q) ? raw.q[0] : raw.q) ?? '').trim().slice(0, 200);

  const { rows, total, matching } = await listSkus(q);

  return (
    <>
      <Header activeTabDef={TAB_BY_ID.catalogue} ctaHref={TAB_BY_ID.manual.href} />

      <div className="p-8 pb-16 flex flex-col gap-6 max-w-7xl">
        <div className="flex flex-col gap-3">
          <CatalogueSearch searchQuery={q} matching={matching} total={total} />
          <CatalogueTable skus={rows} hasQuery={Boolean(q)} />
        </div>
      </div>
    </>
  );
}
