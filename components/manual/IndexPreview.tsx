'use client';

import React from 'react';
import { ManualFormState } from '../../types';
import { Code2 } from 'lucide-react';

interface IndexPreviewProps {
  form: ManualFormState;
  talkingPoints: string;
}

export const IndexPreview: React.FC<IndexPreviewProps> = ({
  form,
  talkingPoints,
}) => {
  const previewJson = JSON.stringify(
    {
      sku: form.sku || 'RB-0000',
      name: form.name || '(untitled)',
      category: form.category || '(uncategorised)',
      price_inr: Number(form.price) || 0,
      stock: Number(form.stock) || 0,
      supplier: form.supplier || '(none)',
      talking_points: talkingPoints
        ? talkingPoints.split('\n').filter(Boolean)
        : [],
      source: 'Manual',
      state: 'LIVE',
    },
    null,
    2
  );

  return (
    <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-3 shadow-sm">
      <div className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
        <Code2 className="w-4 h-4 text-indigo-500" />
        <span>Row preview</span>
      </div>

      <pre className="font-mono text-[11.5px] leading-relaxed text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
        {previewJson}
      </pre>

      <div className="text-xs text-zinc-500">
        This is the row that will be written to the catalogue. Embedding and retrieval
        are not wired up yet, so the avatar does not read from it.
      </div>
    </div>
  );
};
