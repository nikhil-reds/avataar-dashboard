'use client';

import { useState } from 'react';
import { Header } from '../../components/layout/Header';
import { LogFilters } from '../../components/logs/LogFilters';
import { LogTable } from '../../components/logs/LogTable';
import { TraceDetail } from '../../components/logs/TraceDetail';
import { TAB_BY_ID, INITIAL_LOG_ROWS } from '../../data/mockData';

export default function ActiveLogPage() {
  const [logFilter, setLogFilter] = useState<string>('all');
  const [logQuery, setLogQuery] = useState<string>('');
  const [selectedLogIdx, setSelectedLogIdx] = useState<number>(0);

  const filteredLogs = INITIAL_LOG_ROWS.filter((r) => {
    const matchesFilter = logFilter === 'all' || r.kind === logFilter;
    const q = logQuery.trim().toLowerCase();
    const matchesQuery =
      !q || (r.event + r.session + r.model).toLowerCase().includes(q);
    return matchesFilter && matchesQuery;
  });

  const selectedLog =
    filteredLogs[selectedLogIdx] || filteredLogs[0] || INITIAL_LOG_ROWS[0];

  return (
    <>
      <Header activeTabDef={TAB_BY_ID.logs} />

      <div className="p-8 pb-16 flex flex-col gap-6 max-w-7xl">
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
      </div>
    </>
  );
}
