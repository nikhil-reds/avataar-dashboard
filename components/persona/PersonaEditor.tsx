'use client';

import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Save, Sparkles, Loader2, UploadCloud } from 'lucide-react';

import { Header } from '@/components/layout/Header';
import type { PublishedPersona } from '@/lib/publishedPersona';
import type { NavTab, PersonaSettings } from '@/types';

interface PersonaEditorProps {
  initialSettings: PersonaSettings;
  tab: NavTab;
}

type PersonaForm = Pick<
  PersonaSettings,
  'openingIntro' | 'persona' | 'instructions'
>;

const FIELD_LIMITS = {
  openingIntro: 600,
  persona: 1600,
  instructions: 3000,
} as const;

const FIELD_HELP = {
  openingIntro: 'The first spoken line when a shopper connects.',
  persona: 'The stable character profile: tone, role, boundaries and style.',
  instructions: 'Operational rules that should guide every answer.',
} as const;

const DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
  timeZone: 'Asia/Kolkata',
});

function toForm(settings: PersonaSettings): PersonaForm {
  return {
    openingIntro: settings.openingIntro,
    persona: settings.persona,
    instructions: settings.instructions,
  };
}

function Field({
  label,
  name,
  value,
  rows,
  onChange,
}: {
  label: string;
  name: keyof PersonaForm;
  value: string;
  rows: number;
  onChange: (name: keyof PersonaForm, value: string) => void;
}) {
  const limit = FIELD_LIMITS[name];
  const remaining = limit - value.length;

  return (
    <label className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-900 dark:text-white">
            {label}
          </div>
          <div className="text-[12px] text-zinc-500 dark:text-zinc-400">
            {FIELD_HELP[name]}
          </div>
        </div>
        <span
          className={`font-mono text-[10px] ${
            remaining < 0 ? 'text-rose-500' : 'text-zinc-400'
          }`}
        >
          {value.length}/{limit}
        </span>
      </div>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(name, event.target.value)}
        className="w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm leading-6 text-zinc-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      />
    </label>
  );
}

export function PersonaEditor({ initialSettings, tab }: PersonaEditorProps) {
  const [form, setForm] = useState<PersonaForm>(() => toForm(initialSettings));
  const [saved, setSaved] = useState<PersonaSettings>(initialSettings);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<PublishedPersona | null>(null);
  const [agentConfigured, setAgentConfigured] = useState<boolean | null>(null);
  const [toast, setToast] = useState<{ text: string; failed: boolean } | null>(null);
  useEffect(() => {
    fetch('/api/persona/publish').then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setPublished(data.published); setAgentConfigured(data.agentConfigured);
    }).catch(() => setError('Could not read publication status from Redis.'));
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const unpublished = !published || (Object.keys(FIELD_LIMITS) as Array<keyof PersonaForm>)
    .some((key) => form[key].trim() !== published[key]);

  const isDirty = useMemo(
    () =>
      form.openingIntro !== saved.openingIntro ||
      form.persona !== saved.persona ||
      form.instructions !== saved.instructions,
    [form, saved]
  );

  const validationError = useMemo(() => {
    for (const key of Object.keys(FIELD_LIMITS) as Array<keyof PersonaForm>) {
      if (!form[key].trim()) return `${key} is required`;
      if (form[key].length > FIELD_LIMITS[key]) {
        return `${key} must be ${FIELD_LIMITS[key]} characters or fewer`;
      }
    }
    return '';
  }, [form]);

  const publish = async () => {
    if (saving || publishing || validationError) return;
    setPublishing(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/persona/publish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const data = await response.json();
      if (data.saved) { setSaved(data.saved); setForm(toForm(data.saved)); }
      if (!response.ok) throw new Error(data.error || 'Publishing failed. Please retry.');
      setPublished(data.published); setAgentConfigured(data.agentConfigured);
      const text = `Published to Redis and HeyGen with ${data.published.sourceCount} saved sources. Reconnect the avatar to use this version.${data.published.excludedSources?.length ? ` ${data.published.excludedSources.length} sources need extraction or failed ingest.` : ''}`;
      setNotice(text); setToast({ text, failed: false });
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Publishing failed. Please retry.';
      setError(text); setToast({ text, failed: true });
    } finally { setPublishing(false); }
  };


  const updateField = (name: keyof PersonaForm, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setNotice('');
    setError('');
  };

  const reset = () => {
    setForm(toForm(saved));
    setNotice('');
    setError('');
  };

  const save = async () => {
    if (saving || publishing) return;
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setNotice('');
    setError('');

    try {
      const response = await fetch('/api/persona', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Could not save persona settings');
        return;
      }

      setSaved(data);
      setForm(toForm(data));
      setNotice('Persona settings saved');
    } catch {
      setError('Could not reach the server');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {toast && <div role={toast.failed ? 'alert' : 'status'} className="fixed bottom-6 right-6 z-50 max-w-sm rounded-xl border border-admin-border bg-admin-surface p-4 text-sm text-admin-text shadow-xl">
        <p>{toast.text}</p><button type="button" className="mt-2 underline" onClick={() => setToast(null)}>Dismiss</button>
      </div>}
      <Header activeTabDef={tab} onPrimaryClick={save} />

      <div className="flex max-w-7xl flex-col gap-5 p-4 pb-16 sm:p-6 lg:p-8">
        <div className="mb-2 flex items-center gap-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-widest text-zinc-400">
          <span>apps</span>
          <span>/</span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400">
            {tab.crumb}
          </span>
        </div>


        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.25fr)_380px]">
          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                  Live behavior copy
                </h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Keep this crisp. These fields shape the shopper-facing conversation.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={reset}
                  disabled={!isDirty || saving || publishing}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={!isDirty || saving || publishing || Boolean(validationError)}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? 'Saving' : 'Save draft'}
                </button>
                <button type="button" onClick={publish} disabled={saving || publishing || Boolean(validationError)} aria-busy={publishing}
                  className="flex items-center gap-2 rounded-lg bg-admin-accent px-3 py-2 text-xs font-semibold text-admin-on-accent disabled:cursor-wait disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-focus">
                  {publishing ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : <UploadCloud className="size-4" />}
                  {publishing ? 'Publishing…' : 'Publish to avatar'}
                </button>
              </div>
            </div>

            <fieldset disabled={saving || publishing} className="flex flex-col gap-5 disabled:opacity-70">
              <Field
                label="Opening intro"
                name="openingIntro"
                value={form.openingIntro}
                rows={3}
                onChange={updateField}
              />
              <Field
                label="Persona"
                name="persona"
                value={form.persona}
                rows={6}
                onChange={updateField}
              />
              <Field
                label="Instructions"
                name="instructions"
                value={form.instructions}
                rows={9}
                onChange={updateField}
              />
            </fieldset>

            {(notice || error || validationError) && (
              <div
                className={`mt-5 rounded-lg border px-3 py-2 text-sm ${
                  error || validationError
                    ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
                }`}
              >
                {error || validationError || notice}
              </div>
            )}
          </section>

          <aside className="flex flex-col gap-4">
            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Conversation preview
                </h2>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm leading-6 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300">
                {form.openingIntro}
              </div>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Status
              </h2>
              <dl className="mt-3 grid grid-cols-1 gap-3 text-sm">
                <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                    state
                  </dt>
                  <dd className="mt-1 font-semibold text-zinc-900 dark:text-white">
                    {publishing ? 'Publishing…' : unpublished ? 'Unpublished changes' : 'Published'}
                  </dd>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                    last updated
                  </dt>
                  <dd className="mt-1 font-semibold text-zinc-900 dark:text-white">
                    {DATE_FORMATTER.format(new Date(saved.updatedAt))}
                  </dd>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                  <dt className="text-xs text-zinc-500">Last published</dt>
                  <dd className="mt-1">{published ? DATE_FORMATTER.format(new Date(published.publishedAt)) : 'Not published yet'}</dd>
                  <p className="mt-2 text-xs text-zinc-500">{published?.contextId ? `Synced to HeyGen · ${published.sourceCount ?? 0} sources` : agentConfigured ? 'Ready to publish to HeyGen' : 'Configure your HeyGen API key'}</p>
                  <p className="mt-2 text-xs text-zinc-500">Publish again after editing saved sources. Reconnect to use the latest published version.</p>
                  {published?.excludedSources?.map(source => <p key={source.id} className="mt-2 text-xs text-zinc-500">Excluded: {source.title} — {source.reason}</p>)}
                </div>
              </dl>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
