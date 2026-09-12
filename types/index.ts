export type TabId =
  | 'dash'
  | 'logs'
  | 'conversations'
  | 'catalogue'
  | 'ingest'
  | 'manual'
  | 'knowledge'
  | 'avatar'
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

/** Local form state for the avatar knowledge admin. Keywords are edited as free text. */
export interface KnowledgeFormState {
  title: string;
  content: string;
  category: string;
  keywords: string;
  source: string;
  isActive: boolean;
}
