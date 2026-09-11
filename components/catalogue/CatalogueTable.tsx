'use client';

import React from 'react';
import { SkuRow } from '../../types';
import { Search } from 'lucide-react';

interface CatalogueTableProps {
  skus: SkuRow[];
  totalCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const CatalogueTable: React.FC<CatalogueTableProps> = ({
  skus,
  totalCount,
  searchQuery,
  onSearchChange,
}) => {
  const getBadgeStyle = (state: SkuRow['state']) => {
    switch (state) {
      case 'live':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
      case 'review':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
      case 'draft':
      default:
        return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter by name, SKU or category…"
            className="w-full text-xs pl-9 pr-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        <div className="font-mono text-xs text-zinc-500">
          {skus.length} of {totalCount} SKUs
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-[104px_1.6fr_1fr_92px_104px_78px] gap-2 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 font-mono text-[10px] font-bold tracking-wider uppercase text-zinc-400">
          <div>sku</div>
          <div>product</div>
          <div>category</div>
          <div>price</div>
          <div>source</div>
          <div>state</div>
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {skus.map((item, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[104px_1.6fr_1fr_92px_104px_78px] gap-2 px-4 py-3 items-center text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
            >
              <div className="font-mono text-zinc-500 font-medium">{item.sku}</div>
              <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate pr-2">
                {item.name}
              </div>
              <div className="text-zinc-500">{item.category}</div>
              <div className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                {item.price}
              </div>
              <div className="text-zinc-400 text-[11.5px]">{item.source}</div>
              <div>
                <span
                  className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full inline-block text-center capitalize ${getBadgeStyle(
                    item.state
                  )}`}
                >
                  {item.state}
                </span>
              </div>
            </div>
          ))}
          {skus.length === 0 && (
            <div className="p-8 text-center text-xs text-zinc-400">
              No SKUs match that filter query.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
