'use client';

import React from 'react';
import { StatItem } from '../../types';

interface StatCardProps {
  stat: StatItem;
}

export const StatCard: React.FC<StatCardProps> = ({ stat }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-1.5 shadow-sm hover:shadow-md transition-shadow">
      <div className="font-mono text-[10px] tracking-wider uppercase text-zinc-500 font-semibold">
        {stat.label}
      </div>
      <div className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
        {stat.value}
      </div>
      <div className={`text-xs font-medium ${stat.deltaColor}`}>
        {stat.delta}
      </div>
    </div>
  );
};
