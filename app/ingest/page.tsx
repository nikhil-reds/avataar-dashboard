'use client';

import { useState } from 'react';
import { Header } from '../../components/layout/Header';
import { PdfDropzone } from '../../components/ingest/PdfDropzone';
import { ExtractionQueue } from '../../components/ingest/ExtractionQueue';
import { ReviewRows } from '../../components/ingest/ReviewRows';
import {
  TAB_BY_ID,
  INITIAL_INGEST_JOBS,
  INITIAL_REVIEW_ROWS,
} from '../../data/mockData';

export default function IngestPage() {
  const [selectedJobIdx, setSelectedJobIdx] = useState<number>(1);
  const [verdicts, setVerdicts] = useState<
    Record<number, 'approved' | 'rejected'>
  >({});

  const activeJob = INITIAL_INGEST_JOBS[selectedJobIdx] || INITIAL_INGEST_JOBS[0];

  return (
    <>
      <Header
        activeTabDef={TAB_BY_ID.ingest}
        onPrimaryClick={() => setSelectedJobIdx(2)}
      />

      <div className="p-8 pb-16 flex flex-col gap-6 max-w-7xl">
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
      </div>
    </>
  );
}
