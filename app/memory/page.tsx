'use client';

import { useState } from 'react';
import { Header } from '../../components/layout/Header';
import { SessionList } from '../../components/memory/SessionList';
import { TranscriptView } from '../../components/memory/TranscriptView';
import { RetainedFacts } from '../../components/memory/RetainedFacts';
import { TAB_BY_ID, INITIAL_SESSIONS } from '../../data/mockData';

export default function MemoryPage() {
  const [selectedSessionIdx, setSelectedSessionIdx] = useState<number>(0);
  const [forgotten, setForgotten] = useState<boolean>(false);

  const activeSession =
    INITIAL_SESSIONS[selectedSessionIdx] || INITIAL_SESSIONS[0];

  const selectSession = (idx: number) => {
    setSelectedSessionIdx(idx);
    setForgotten(false);
  };

  return (
    <>
      <Header
        activeTabDef={TAB_BY_ID.memory}
        onPrimaryClick={() => selectSession(3)}
      />

      <div className="p-8 pb-16 flex flex-col gap-6 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
          <SessionList
            sessions={INITIAL_SESSIONS}
            selectedIdx={selectedSessionIdx}
            onSelectSession={selectSession}
            retentionHours={48}
          />

          <div className="flex flex-col gap-6">
            <TranscriptView
              session={activeSession}
              forgotten={forgotten}
              onForget={() => setForgotten(true)}
            />

            <RetainedFacts facts={forgotten ? [] : activeSession.facts} />
          </div>
        </div>
      </div>
    </>
  );
}
