'use client';

import React from 'react';
import { ManualFormState } from '../../types';
import { Save, RotateCcw, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

interface EntryFormProps {
  form: ManualFormState;
  onChangeField: (key: keyof ManualFormState, value: string) => void;
  talkingPoints: string;
  onChangeTalkingPoints: (value: string) => void;
  saveNotice: string;
  error?: string;
  saving?: boolean;
  onSave: () => void;
  onReset: () => void;
}

export const EntryForm: React.FC<EntryFormProps> = ({
  form,
  onChangeField,
  talkingPoints,
  onChangeTalkingPoints,
  saveNotice,
  error = '',
  saving = false,
  onSave,
  onReset,
}) => {
  const fields: { key: keyof ManualFormState; label: string; placeholder: string }[] = [
    { key: 'sku', label: 'sku', placeholder: 'RB-0000' },
    { key: 'name', label: 'product name', placeholder: 'Antique-finish kada, pair' },
    { key: 'category', label: 'category', placeholder: 'Bangles' },
    { key: 'price', label: 'price (₹)', placeholder: '96400' },
    { key: 'stock', label: 'stock on hand', placeholder: '4' },
    { key: 'supplier', label: 'supplier', placeholder: 'Sree Metals, Thrissur' },
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col gap-4 shadow-sm">
      <div className="text-sm font-semibold text-zinc-900 dark:text-white">
        New catalogue entry
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map((f) => (
          <label key={f.key} className="flex flex-col gap-1">
            <span className="font-mono text-[9.5px] uppercase tracking-wider text-zinc-400 font-semibold">
              {f.label}
            </span>
            <input
              type="text"
              value={form[f.key]}
              onChange={(e) => onChangeField(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="text-xs p-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-zinc-50/50 dark:bg-zinc-800/40"
            />
          </label>
        ))}
      </div>

      <label className="flex flex-col gap-1">
        <span className="font-mono text-[9.5px] uppercase tracking-wider text-zinc-400 font-semibold">
          avatar talking points
        </span>
        <textarea
          rows={4}
          value={talkingPoints}
          onChange={(e) => onChangeTalkingPoints(e.target.value)}
          placeholder="What should the avatar say about this product? Two or three selling points."
          className="text-xs p-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-zinc-50/50 dark:bg-zinc-800/40 resize-y leading-relaxed"
        />
      </label>

      <div className="flex items-center gap-3 flex-wrap border-t border-zinc-100 dark:border-zinc-800 pt-4">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all px-4 py-2 rounded-lg cursor-pointer shadow-xs"
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>{saving ? 'Saving…' : 'Save to catalogue'}</span>
        </button>

        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all px-4 py-2 rounded-lg cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Clear</span>
        </button>

        {error ? (
          <div className="ml-auto text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        ) : saveNotice ? (
          <div className="ml-auto text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" />
            <span>{saveNotice}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};
