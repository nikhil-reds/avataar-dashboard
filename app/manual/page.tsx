'use client';

import { useState } from 'react';
import { Header } from '../../components/layout/Header';
import { EntryForm } from '../../components/manual/EntryForm';
import { IndexPreview } from '../../components/manual/IndexPreview';
import { TAB_BY_ID } from '../../data/mockData';
import { ManualFormState } from '../../types';

const EMPTY_FORM: ManualFormState = {
  sku: '',
  name: '',
  category: '',
  price: '',
  stock: '',
  supplier: '',
};

const SAVE_NOTICE = 'Saved · indexing in 30s';

export default function ManualEntryPage() {
  const [manualForm, setManualForm] = useState<ManualFormState>(EMPTY_FORM);
  const [talkingPoints, setTalkingPoints] = useState<string>('');
  const [saveNotice, setSaveNotice] = useState<string>('');

  const handleManualFieldChange = (
    key: keyof ManualFormState,
    value: string
  ) => {
    setManualForm((prev) => ({ ...prev, [key]: value }));
    setSaveNotice('');
  };

  const handleResetManualForm = () => {
    setManualForm(EMPTY_FORM);
    setTalkingPoints('');
    setSaveNotice('');
  };

  return (
    <>
      <Header
        activeTabDef={TAB_BY_ID.manual}
        onPrimaryClick={() => setSaveNotice(SAVE_NOTICE)}
      />

      <div className="p-8 pb-16 flex flex-col gap-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6 items-start">
          <EntryForm
            form={manualForm}
            onChangeField={handleManualFieldChange}
            talkingPoints={talkingPoints}
            onChangeTalkingPoints={(tp) => {
              setTalkingPoints(tp);
              setSaveNotice('');
            }}
            saveNotice={saveNotice}
            onSave={() => setSaveNotice(SAVE_NOTICE)}
            onReset={handleResetManualForm}
          />

          <IndexPreview form={manualForm} talkingPoints={talkingPoints} />
        </div>
      </div>
    </>
  );
}
