'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { EntryForm } from '@/components/manual/EntryForm';
import { IndexPreview } from '@/components/manual/IndexPreview';
import { TAB_BY_ID } from '@/data/navigation';
import { ManualFormState } from '@/types';

const EMPTY_FORM: ManualFormState = {
  sku: '',
  name: '',
  category: '',
  price: '',
  stock: '',
  supplier: '',
};

export default function ManualEntryPage() {
  const router = useRouter();
  const [manualForm, setManualForm] = useState<ManualFormState>(EMPTY_FORM);
  const [talkingPoints, setTalkingPoints] = useState<string>('');
  const [saveNotice, setSaveNotice] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const handleManualFieldChange = (key: keyof ManualFormState, value: string) => {
    setManualForm((prev) => ({ ...prev, [key]: value }));
    setSaveNotice('');
    setError('');
  };

  const handleResetManualForm = () => {
    setManualForm(EMPTY_FORM);
    setTalkingPoints('');
    setSaveNotice('');
    setError('');
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveNotice('');
    setError('');

    try {
      const res = await fetch('/api/skus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...manualForm,
          talkingPoints: talkingPoints.split('\n').filter(Boolean),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Could not save the product');
        return;
      }

      setSaveNotice(`Saved ${data.sku} to the catalogue`);
      setManualForm(EMPTY_FORM);
      setTalkingPoints('');
      // The catalogue is server-rendered, so drop its cached payload.
      router.refresh();
    } catch {
      setError('Could not reach the server');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header activeTabDef={TAB_BY_ID.manual} onPrimaryClick={handleSave} />

      <div className="p-4 sm:p-6 lg:p-8 pb-16 flex flex-col gap-5 sm:gap-6 max-w-7xl">
        <div className="font-mono text-[10.5px] tracking-widest uppercase text-zinc-400 font-semibold flex items-center gap-1.5 mb-2">
          <span>apps</span>
          <span>/</span>
          <span className="text-indigo-600 dark:text-indigo-400 font-bold">
            {TAB_BY_ID.manual.crumb}
          </span>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-6 items-start">
          <EntryForm
            form={manualForm}
            onChangeField={handleManualFieldChange}
            talkingPoints={talkingPoints}
            onChangeTalkingPoints={(tp) => {
              setTalkingPoints(tp);
              setSaveNotice('');
              setError('');
            }}
            saveNotice={saveNotice}
            error={error}
            saving={saving}
            onSave={handleSave}
            onReset={handleResetManualForm}
          />

          <IndexPreview form={manualForm} talkingPoints={talkingPoints} />
        </div>
      </div>
    </>
  );
}

