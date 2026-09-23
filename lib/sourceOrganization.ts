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
      : sort === 'largest' ? b.sizeBytes - a.sizeBytes
      : sort === 'smallest' ? a.sizeBytes - b.sizeBytes
      : sort === 'oldest' ? Date.parse(a.createdAt) - Date.parse(b.createdAt)
      : Date.parse(b.createdAt) - Date.parse(a.createdAt);
    return difference || names || a.id.localeCompare(b.id);
  });
  const groups = new Map<string, IngestSourceRow[]>();
  for (const source of sorted) {
    const label = grouping === 'none' ? 'All sources'
      : grouping === 'status' ? STATUS_LABELS[source.status]
      : source.kind === 'TEXT' ? 'Pasted text' : source.ext.toUpperCase() || 'Other files';
    const rows = groups.get(label) ?? [];
    rows.push(source);
    groups.set(label, rows);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([label, rows]) => ({ label, rows }));
}
