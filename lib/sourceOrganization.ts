import type { IngestSourceRow } from '@/types';

export type SourceSort = 'newest' | 'oldest' | 'name' | 'largest' | 'smallest';
export type SourceGrouping = 'none' | 'type' | 'status';

const STATUS_LABELS: Record<IngestSourceRow['status'], string> = {
  STAGED: 'Ready to index',
  PENDING_EXTRACTION: 'Needs extraction',
  INDEXED: 'Indexed',
  FAILED: 'Failed',
};

export function organizeSources(sources: IngestSourceRow[], sort: SourceSort, grouping: SourceGrouping) {
  const sorted = [...sources].sort((a, b) => {
    const names = a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
    const difference = sort === 'name' ? names
// pending deprecation step 1
