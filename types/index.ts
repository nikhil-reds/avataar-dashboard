export type TabId = 'dash' | 'logs' | 'catalogue' | 'ingest' | 'manual' | 'avatar' | 'memory';

export interface NavTab {
  id: TabId;
  label: string;
  badge: string;
  crumb: string;
  title: string;
  subtitle: string;
  cta: string;
}

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

export interface LogRow {
  time: string;
  event: string;
  session: string;
  model: string;
  latency: string;
  kind: 'chat' | 'render' | 'ingest';
  status: string;
}

export interface PipelineStep {
  name: string;
  ms: string;
  color: string;
}

export interface SkuRow {
  sku: string;
  name: string;
  category: string;
  price: string;
  source: string;
  state: 'live' | 'review' | 'draft';
}

export interface IngestJob {
  file: string;
  state: 'done' | 'extracting' | 'queued' | 'failed';
  pct: string;
  note: string;
  page: number;
}

export interface ReviewField {
  k: string;
  v: string;
}

export interface ReviewRow {
  name: string;
  conf: string;
  fields: ReviewField[];
}

export interface Turn {
  who: 'shopper' | 'avatar' | 'system';
  text: string;
  time: string;
}

export interface RetainedFact {
  k: string;
  v: string;
  exp: string;
}

export interface SessionItem {
  name: string;
  summary: string;
  ttl: string;
  fresh: boolean;
  turns: Turn[];
  facts: RetainedFact[];
}

export interface AvatarRender {
  script: string;
  voice: string;
  length: string;
  state: 'done' | 'rendering' | 'queued' | 'failed';
}

export interface ManualFormState {
  sku: string;
  name: string;
  category: string;
  price: string;
  stock: string;
  supplier: string;
}
