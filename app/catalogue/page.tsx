'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../components/layout/Header';
import { CatalogueTable } from '../../components/catalogue/CatalogueTable';
import { TAB_BY_ID, INITIAL_SKU_ROWS } from '../../data/mockData';

export default function CataloguePage() {
  const router = useRouter();
  const [skuQuery, setSkuQuery] = useState<string>('');

  const filteredSkus = INITIAL_SKU_ROWS.filter((r) => {
    const q = skuQuery.trim().toLowerCase();
    return !q || (r.sku + r.name + r.category).toLowerCase().includes(q);
  });

  return (
    <>
      {/* "Add product" hands off to the manual entry route. */}
      <Header
        activeTabDef={TAB_BY_ID.catalogue}
        onPrimaryClick={() => router.push(TAB_BY_ID.manual.href)}
      />

      <div className="p-8 pb-16 flex flex-col gap-6 max-w-7xl">
        <CatalogueTable
          skus={filteredSkus}
          totalCount={INITIAL_SKU_ROWS.length}
          searchQuery={skuQuery}
          onSearchChange={setSkuQuery}
        />
      </div>
    </>
  );
}
