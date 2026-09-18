import React from 'react';
import { SkuState } from '@prisma/client';
import { formatPrice, type SkuRecord } from '../../lib/catalogue';

interface CatalogueTableProps {
  skus: SkuRecord[];
  hasQuery: boolean;
}

// Six columns will not fit a phone, so below `md` each row renders as a stacked
// card instead (see the row body). The tracks are unchanged at `md` and up.
const GRID = 'grid grid-cols-[104px_1.6fr_1fr_104px_104px_78px] gap-2';

const BADGE = 'text-[10.5px] font-bold px-2 py-0.5 rounded-full inline-block text-center capitalize';

function badgeStyle(state: SkuState): string {
  switch (state) {
    case SkuState.LIVE:
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
    case SkuState.REVIEW:
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
    default:
      return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
  }
}

export const CatalogueTable: React.FC<CatalogueTableProps> = ({ skus, hasQuery }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <div
        className={`hidden md:grid ${GRID} px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 font-mono text-[10px] font-bold tracking-wider uppercase text-zinc-400`}
      >
        <div>sku</div>
        <div>product</div>
        <div>category</div>
        <div>price</div>
        <div>source</div>
        <div>state</div>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {skus.map((item) => {
          const price = formatPrice(item.price);
          const badge = (
            <span className={`${BADGE} ${badgeStyle(item.state)}`}>
              {item.state.toLowerCase()}
            </span>
          );

          return (
            <div
              key={item.id}
              className="text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
            >
              {/* Phone: the six columns regrouped into a card — name first, then the
                  identifier, then the details that only matter once you have found
                  the row you were looking for. */}
              <div className="md:hidden flex flex-col gap-1 px-4 py-3">
                <div className="flex justify-between items-start gap-2">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 min-w-0">
                    {item.name}
                  </span>
                  <span className="shrink-0">{badge}</span>
                </div>
                <div className="font-mono text-[11.5px] text-zinc-500">{item.sku}</div>
                <div className="text-[11.5px] text-zinc-500 flex flex-wrap gap-x-1.5">
                  <span>{item.category}</span>
                  <span className="text-zinc-300 dark:text-zinc-600">·</span>
                  <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">
                    {price}
                  </span>
                  <span className="text-zinc-300 dark:text-zinc-600">·</span>
                  <span className="text-zinc-400">{item.source}</span>
                </div>
              </div>

              <div className={`hidden md:grid ${GRID} px-4 py-3 items-center`}>
                <div className="font-mono text-zinc-500 font-medium truncate">{item.sku}</div>
                <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate pr-2">
                  {item.name}
                </div>
                <div className="text-zinc-500 truncate">{item.category}</div>
                <div className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                  {price}
                </div>
                <div className="text-zinc-400 text-[11.5px] truncate">{item.source}</div>
                <div>{badge}</div>
              </div>
            </div>
          );
        })}

        {skus.length === 0 && (
          <div className="p-8 text-center text-xs text-zinc-400">
            {hasQuery
              ? 'No SKUs match that filter.'
              : 'The catalogue is empty. Add a product from Manual entry, or ingest a supplier PDF.'}
          </div>
        )}
      </div>
    </div>
  );
};
