'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/dashboard/StatCard';
import { ServiceHealth } from '@/components/dashboard/ServiceHealth';
import { LatencyRoute } from '@/components/dashboard/LatencyRoute';
import { LogFilters } from '@/components/logs/LogFilters';
import { LogTable } from '@/components/logs/LogTable';
import { TraceDetail } from '@/components/logs/TraceDetail';
import { CatalogueTable } from '@/components/catalogue/CatalogueTable';
import { PdfDropzone } from '@/components/ingest/PdfDropzone';
import { ExtractionQueue } from '@/components/ingest/ExtractionQueue';
import { ReviewRows } from '@/components/ingest/ReviewRows';
import { EntryForm } from '@/components/manual/EntryForm';
import { IndexPreview } from '@/components/manual/IndexPreview';
import { AvatarPreview } from '@/components/avatar/AvatarPreview';
import { ScriptComposer } from '@/components/avatar/ScriptComposer';
import { RenderQueue } from '@/components/avatar/RenderQueue';
import { SessionList } from '@/components/memory/SessionList';
import { TranscriptView } from '@/components/memory/TranscriptView';
import { RetainedFacts } from '@/components/memory/RetainedFacts';

import {
  TAB_DEFINITIONS,
  INITIAL_STATS,
  INITIAL_SERVICES,
  INITIAL_LATENCY,
  INITIAL_LOG_ROWS,
  INITIAL_SKU_ROWS,
  INITIAL_INGEST_JOBS,
  INITIAL_REVIEW_ROWS,
  INITIAL_SESSIONS,
  INITIAL_RENDERS,
} from '@/data/mockData';

import { TabId, ManualFormState, AvatarRender } from '@/types';

export default function DashboardPage() {
  // Navigation
  const [activeTab, setActiveTab] = useState<TabId>('dash');

  // Logs state
  const [logFilter, setLogFilter] = useState<string>('all');
  const [logQuery, setLogQuery] = useState<string>('');
  const [selectedLogIdx, setSelectedLogIdx] = useState<number>(0);

  // Catalogue state
  const [skuQuery, setSkuQuery] = useState<string>('');

  // Ingest state
  const [selectedJobIdx, setSelectedJobIdx] = useState<number>(1);
  const [verdicts, setVerdicts] = useState<Record<number, 'approved' | 'rejected'>>({});

  // Manual entry state
  const [manualForm, setManualForm] = useState<ManualFormState>({
    sku: '',
    name: '',
    category: '',
    price: '',
    stock: '',
    supplier: '',
  });
  const [talkingPoints, setTalkingPoints] = useState<string>('');
  const [saveNotice, setSaveNotice] = useState<string>('');

  // Avatar studio state
  const [script, setScript] = useState<string>(
    'Namaste! Let me show you three necklaces that match your budget.'
  );
  const [voice, setVoice] = useState<string>('Hindi–English (Meera)');
  const [rendering, setRendering] = useState<boolean>(false);
  const [renderDone, setRenderDone] = useState<boolean>(false);
  const [renders, setRenders] = useState<AvatarRender[]>(INITIAL_RENDERS);

  // Memory state
  const [selectedSessionIdx, setSelectedSessionIdx] = useState<number>(0);
  const [forgotten, setForgotten] = useState<boolean>(false);

  // Computed / Filtered Data
  const currentTabDef =
    TAB_DEFINITIONS.find((t) => t.id === activeTab) || TAB_DEFINITIONS[0];

  // Filtered Logs
  const filteredLogs = INITIAL_LOG_ROWS.filter((r) => {
    const matchesFilter = logFilter === 'all' || r.kind === logFilter;
    const q = logQuery.trim().toLowerCase();
    const matchesQuery =
      !q || (r.event + r.session + r.model).toLowerCase().includes(q);
    return matchesFilter && matchesQuery;
  });

  const selectedLog =
    filteredLogs[selectedLogIdx] || filteredLogs[0] || INITIAL_LOG_ROWS[0];

  // Filtered SKUs
  const filteredSkus = INITIAL_SKU_ROWS.filter((r) => {
    const q = skuQuery.trim().toLowerCase();
    return !q || (r.sku + r.name + r.category).toLowerCase().includes(q);
  });

  // Handlers
  const handlePrimaryClick = () => {
    if (activeTab === 'catalogue') {
      setActiveTab('manual');
    } else if (activeTab === 'ingest') {
      setSelectedJobIdx(2);
    } else if (activeTab === 'avatar') {
      handleTriggerRender();
    } else if (activeTab === 'memory') {
      setSelectedSessionIdx(3);
    } else if (activeTab === 'manual') {
      setSaveNotice('Saved · indexing in 30s');
    }
  };

  const handleTriggerRender = () => {
    if (rendering) return;
    setRendering(true);
    setRenderDone(false);
    setTimeout(() => {
      setRendering(false);
      setRenderDone(true);
      const newRender: AvatarRender = {
        script,
        voice: voice.split(' ')[0],
        length: '0:18',
        state: 'done',
      };
      setRenders((prev) => [newRender, ...prev]);
    }, 1800);
  };

  const handleManualFieldChange = (key: keyof ManualFormState, value: string) => {
    setManualForm((prev) => ({ ...prev, [key]: value }));
    setSaveNotice('');
  };

  const handleSaveManualEntry = () => {
    setSaveNotice('Saved · indexing in 30s');
  };

  const handleResetManualForm = () => {
    setManualForm({
      sku: '',
      name: '',
      category: '',
      price: '',
      stock: '',
      supplier: '',
    });
    setTalkingPoints('');
    setSaveNotice('');
  };

  const activeJob = INITIAL_INGEST_JOBS[selectedJobIdx] || INITIAL_INGEST_JOBS[0];
  const activeSession = INITIAL_SESSIONS[selectedSessionIdx] || INITIAL_SESSIONS[0];

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Sidebar Navigation */}
      <Sidebar
        tabs={TAB_DEFINITIONS}
        activeTab={activeTab}
        onSelectTab={(id) => {
          setActiveTab(id);
          if (id === 'memory') setForgotten(false);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Dynamic Header */}
        <Header
          activeTabDef={currentTabDef}
          onPrimaryClick={handlePrimaryClick}
        />

        {/* Tab Content Canvas */}
        <div className="p-8 pb-16 flex flex-col gap-6 max-w-7xl">
          {/* Dashboard View */}
          {activeTab === 'dash' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {INITIAL_STATS.map((stat, idx) => (
                  <StatCard key={idx} stat={stat} />
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <ServiceHealth services={INITIAL_SERVICES} />
                <LatencyRoute latencyItems={INITIAL_LATENCY} />
              </div>
            </div>
          )}

          {/* Activity Logs View */}
          {activeTab === 'logs' && (
            <div className="flex flex-col gap-4">
              <LogFilters
                filter={logFilter}
                onSelectFilter={(kind) => {
                  setLogFilter(kind);
                  setSelectedLogIdx(0);
                }}
                searchQuery={logQuery}
                onSearchChange={(q) => {
                  setLogQuery(q);
                  setSelectedLogIdx(0);
                }}
              />

              <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-6 items-start">
                <LogTable
                  logs={filteredLogs}
                  selectedIndex={selectedLogIdx}
                  onSelectRow={(idx) => setSelectedLogIdx(idx)}
                />
                <TraceDetail log={selectedLog} />
              </div>
            </div>
          )}

          {/* Catalogue View */}
          {activeTab === 'catalogue' && (
            <CatalogueTable
              skus={filteredSkus}
              totalCount={INITIAL_SKU_ROWS.length}
              searchQuery={skuQuery}
              onSearchChange={setSkuQuery}
            />
          )}

          {/* PDF Ingest View */}
          {activeTab === 'ingest' && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr] gap-6 items-start">
              <div className="flex flex-col gap-4">
                <PdfDropzone onUpload={() => setSelectedJobIdx(2)} />
                <ExtractionQueue
                  jobs={INITIAL_INGEST_JOBS}
                  selectedJobIdx={selectedJobIdx}
                  onSelectJob={(idx) => setSelectedJobIdx(idx)}
                />
              </div>

              <ReviewRows
                rows={INITIAL_REVIEW_ROWS}
                verdicts={verdicts}
                fileName={activeJob.file}
                pageNumber={activeJob.page}
                onApprove={(idx) =>
                  setVerdicts((prev) => ({ ...prev, [idx]: 'approved' }))
                }
                onReject={(idx) =>
                  setVerdicts((prev) => ({ ...prev, [idx]: 'rejected' }))
                }
              />
            </div>
          )}

          {/* Manual Entry View */}
          {activeTab === 'manual' && (
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
                onSave={handleSaveManualEntry}
                onReset={handleResetManualForm}
              />

              <IndexPreview
                form={manualForm}
                talkingPoints={talkingPoints}
              />
            </div>
          )}

          {/* Avatar Studio View */}
          {activeTab === 'avatar' && (
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
              <AvatarPreview voiceLabel={voice} />

              <div className="flex flex-col gap-6">
                <ScriptComposer
                  script={script}
                  onChangeScript={(s) => {
                    setScript(s);
                    setRenderDone(false);
                  }}
                  voice={voice}
                  onSelectVoice={setVoice}
                  voices={[
                    'Hindi–English (Meera)',
                    'English IN (Meera)',
                    'Tamil (Anitha)',
                  ]}
                  rendering={rendering}
                  renderDone={renderDone}
                  onRender={handleTriggerRender}
                />

                <RenderQueue
                  renders={renders}
                  creditNote="913 / 1000 min left"
                />
              </div>
            </div>
          )}

          {/* Memory View */}
          {activeTab === 'memory' && (
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
              <SessionList
                sessions={INITIAL_SESSIONS}
                selectedIdx={selectedSessionIdx}
                onSelectSession={(idx) => {
                  setSelectedSessionIdx(idx);
                  setForgotten(false);
                }}
                retentionHours={48}
              />

              <div className="flex flex-col gap-6">
                <TranscriptView
                  session={activeSession}
                  forgotten={forgotten}
                  onForget={() => setForgotten(true)}
                />

                <RetainedFacts
                  facts={forgotten ? [] : activeSession.facts}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
