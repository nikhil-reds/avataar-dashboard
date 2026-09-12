'use client';

import React from 'react';
import { KnowledgeFormState } from '../../types';
import { Save, RotateCcw, CheckCircle, Loader2, AlertCircle, X } from 'lucide-react';

interface KnowledgeFormProps {
  form: KnowledgeFormState;
  /** Set while an existing entry is being edited; null when composing a new one. */
  editingId: string | null;
  onChangeField: <K extends keyof KnowledgeFormState>(key: K, value: KnowledgeFormState[K]) => void;
  notice: string;
  error: string;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
}

const INPUT_CLASS =
  'text-xs p-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-zinc-50/50 dark:bg-zinc-800/40';

const LABEL_CLASS =
  'font-mono text-[9.5px] uppercase tracking-wider text-zinc-400 font-semibold';

export const KnowledgeForm: React.FC<KnowledgeFormProps> = ({
  form,
  editingId,
  onChangeField,
  notice,
  error,
  saving,
  onSave,
  onReset,
}) => {
  const isEditing = editingId !== null;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col gap-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-zinc-900 dark:text-white">
          {isEditing ? 'Edit knowledge entry' : 'New knowledge entry'}
        </div>
        {isEditing && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel edit</span>
          </button>
        )}
      </div>

      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>title</span>
        <input
          type="text"
          value={form.title}
          onChange={(e) => onChangeField('title', e.target.value)}
          placeholder="Office Location"
          className={INPUT_CLASS}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>knowledge / content</span>
        <textarea
          rows={6}
          value={form.content}
          onChange={(e) => onChangeField('content', e.target.value)}
          placeholder="Our Bangalore office is located at…"
          className={`${INPUT_CLASS} resize-y leading-relaxed`}
        />
        <span className="text-[10.5px] text-zinc-400">
          What the avatar should say. Write it the way you would say it out loud.
        </span>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className={LABEL_CLASS}>category</span>
          <input
            type="text"
            value={form.category}
            onChange={(e) => onChangeField('category', e.target.value)}
            placeholder="company"
            className={INPUT_CLASS}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={LABEL_CLASS}>keywords</span>
          <input
            type="text"
            value={form.keywords}
            onChange={(e) => onChangeField('keywords', e.target.value)}
            placeholder="office, bangalore, location"
            className={INPUT_CLASS}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className={LABEL_CLASS}>source (optional)</span>
        <input
          type="text"
          value={form.source}
          onChange={(e) => onChangeField('source', e.target.value)}
          placeholder="Internal handbook, page 4"
          className={INPUT_CLASS}
        />
      </label>

      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => onChangeField('isActive', e.target.checked)}
          className="w-4 h-4 accent-indigo-600 cursor-pointer"
        />
        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Active</span>
        <span className="text-[10.5px] text-zinc-400">
          Only active entries are used when the avatar answers.
        </span>
      </label>

      <div className="flex items-center gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-4 flex-wrap">
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
          <span>{saving ? 'Saving…' : isEditing ? 'Save changes' : 'Save knowledge'}</span>
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
        ) : notice ? (
          <div className="ml-auto text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" />
            <span>{notice}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};
