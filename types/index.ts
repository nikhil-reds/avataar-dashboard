export type TabId =
  | 'dash'
  | 'logs'
  | 'conversations'
  | 'catalogue'
  | 'ingest'
  | 'manual'
  | 'memory';

export interface NavTab {
  id: TabId;
  /** URL this tab lives at, e.g. `/dashboard`. */
  href: string;
  label: string;
  badge: string;
  crumb: string;
  title: string;
  subtitle: string;
  cta: string;
}

// View models for the dashboard cards. Every value is computed from stored rows in
// lib/dashboard.ts — the shapes below only describe how a figure is presented.

export interface StatItem {
  label: string;
  value: string;
  delta: string;
  deltaColor: string;
}

export interface ServiceHealthItem {
  name: string;
  note: string;
  metric: string;
  color: string;
}

export interface LatencyItem {
  name: string;
  readout: string;
  pct: string;
  color: string;
}

/** Local form state for manual catalogue entry. */
export interface ManualFormState {
  sku: string;
  name: string;
  category: string;
  price: string;
  stock: string;
  supplier: string;
}


// Ingest sources and page index.
//
// These mirror the Prisma models as they cross the wire. They are hand-written string
// unions rather than the generated enums so client components can import them without
// pulling @prisma/client into the browser bundle.

export type IngestSourceKindValue = 'FILE' | 'TEXT';

/**
 * PENDING_EXTRACTION is not a failure: PDF and Word hold real content that cannot be
 * decoded until an extractor exists, so those sources store as metadata only.
 */
export type IngestSourceStatusValue =
  | 'STAGED'
  | 'PENDING_EXTRACTION'
  | 'INDEXED'
  | 'FAILED';

/** A stored source, as the API returns it. Never carries the document text. */
export interface IngestSourceRow {
  id: string;
  kind: IngestSourceKindValue;
  title: string;
  fileName: string | null;
  mime: string;
  ext: string;
  sizeBytes: number;
  status: IngestSourceStatusValue;
  note: string | null;
  /** Whether the row has decoded text, and whether an original file can be downloaded. */
  hasText: boolean;
  hasFile: boolean;
  createdAt: string;
}

/** An upload in flight, held only until the server answers with a row. */
export interface PendingUpload {
  tempId: string;
  name: string;
  sizeBytes: number;
  error?: string;
}

/**
 * The shape `buildPageIndex` consumes. Both a stored row and an in-memory upload map
 * onto it, so one splitter serves the API and any future extraction worker.
 */
export interface IndexableSource {
  id: string;
  kind: IngestSourceKindValue;
  title: string;
  mime: string;
  sizeBytes: number;
  text?: string | null;
  /** Why text is missing, when it is. Absent means the source simply has none. */
  unavailable?: 'pending_extraction' | 'error';
  note?: string | null;
}

/** One section of a document. Offsets index into the source's stored text. */
export interface PageIndexNode {
  id: string;
  depth: number;
  heading: string;
  start: number;
  end: number;
  words: number;
  preview: string;
}

export type PageIndexDocumentStatus = 'indexed' | 'pending_extraction' | 'error';

export interface PageIndexDocument {
  id: string;
  sourceId: string;
  title: string;
  kind: Lowercase<IngestSourceKindValue>;
  mime: string;
  sizeBytes: number;
  status: PageIndexDocumentStatus;
  note?: string;
  stats?: { chars: number; words: number; sections: number };
  nodes: PageIndexNode[];
}

/** The JSON page index: what the preview panel renders and the API stores and returns. */
export interface PageIndexDoc {
  version: string;
  generatedAt: string;
  sourceCount: number;
  documents: PageIndexDocument[];
  /** Present once persisted; absent for an index that was only computed. */
  buildId?: string;
  label?: string | null;
}

/** One row in the build history list. */
export interface PageIndexBuildSummary {
  id: string;
  version: string;
  label: string | null;
  sourceCount: number;
  documentCount: number;
  nodeCount: number;
  createdAt: string;
}

/** A catalogue row expanded for the detail sidebar. Prisma's Decimal and Date values
    are formatted on the server, so everything here crosses to the client as-is. */
export interface SkuDetail {
  id: string;
  sku: string;
  name: string;
  category: string;
  /** Rendered as currency, e.g. "₹96,400". */
  price: string;
  stock: number;
  weight: string | null;
  makingCharge: string | null;
  supplier: string | null;
  talkingPoints: string[];
  source: string;
  state: 'LIVE' | 'REVIEW' | 'DRAFT';
  createdAt: string;
  updatedAt: string;
}
