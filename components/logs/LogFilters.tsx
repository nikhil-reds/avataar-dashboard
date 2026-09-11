'use client';

import React from 'react';
import { Search } from 'lucide-react';

interface LogFiltersProps {
  filter: string;
  onSelectFilter: (kind: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const FILTERS = [
  { id: 'all', label: 'All events' },
  { id: 'chat', label: 'Conversations' },
  { id: 'render', label: 'Renders' },
  { id: 'ingest', label: 'Ingest' },
];

export const LogFilters: React.FC<LogFiltersProps> = ({
  filter,
  onSelectFilter,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <div className="flex gap-3 flex-wrap items-center">
      <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-full border border-zinc-200/80 dark:border-zinc-700">
        {FILTERS.map((item) => {
          const isActive = filter === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectFilter(item.id)}
              className={`text-[12.5px] font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                isActive
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="relative flex-1 min-w-[220px]">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search session id, SKU, utterance…"
          className="w-full text-xs pl-9 pr-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
        />
      </div>
    </div>
  );
};
