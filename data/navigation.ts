import { NavTab, TabId } from '../types';

// Navigation configuration for the admin console. This is app structure, not
// sample content: every page below reads its rows from the database.
export const TAB_DEFINITIONS: NavTab[] = [
  {
    id: 'dash',
    href: '/dashboard',
    label: 'Dashboard',
    badge: '',
    crumb: 'overview',
    title: 'System health',
    subtitle:
      'Live status of the avatar pipeline: retrieval, local inference, HeyGen renders and the memory store.',
    cta: 'Run diagnostics',
  },
  {
    id: 'logs',
    href: '/activelog',
    label: 'Activity logs',
    badge: '',
    crumb: 'observability',
    title: 'Activity & request logs',
    subtitle:
      'Every turn the avatar handled, with the model that answered it and where the time went.',
    cta: 'Export CSV',
  },
  {
    id: 'conversations',
    href: '/conversations',
    label: 'Conversations',
    badge: '',
    crumb: 'observability',
    title: 'Shopper conversations',
    subtitle:
      'Every question a shopper asked and every answer the avatar gave, stored turn by turn.',
    cta: 'Export CSV',
  },
  {
    id: 'catalogue',
    href: '/catalogue',
    label: 'Catalogue',
    badge: '',
    crumb: 'content',
    title: 'Product catalogue',
    subtitle:
      'Everything the avatar is allowed to talk about. Rows arrive from PDF extraction or manual entry.',
    cta: 'Add product',
  },
  {
    id: 'ingest',
    href: '/ingest',
    label: 'PDF ingest',
    badge: '',
    crumb: 'content',
    title: 'PDF ingest & scrape review',
    subtitle:
      'Upload supplier documents, watch extraction, and approve rows before they reach the catalogue.',
    cta: 'Upload PDF',
  },
  {
    id: 'manual',
    href: '/manual',
    label: 'Manual entry',
    badge: '',
    crumb: 'content',
    title: 'Manual data entry',
    subtitle:
      'Add or correct a product by hand when no document exists — same schema as the extractor writes.',
    cta: 'Save entry',
  },
  {
    id: 'avatar',
    href: '/avatar',
    label: 'Avatar studio',
    badge: '',
    crumb: 'avatar',
    title: 'Avatar & video generation',
    subtitle:
      'Full-body Indian persona rendered through HeyGen. Compose a script, pick a voice, queue the render.',
    cta: 'New render',
  },
  {
    id: 'memory',
    href: '/memory',
    label: 'Memory',
    badge: '',
    crumb: 'avatar',
    title: 'Conversational memory',
    subtitle:
      'Rolling context window per shopper. Facts and transcripts expire automatically once the window closes.',
    cta: 'Purge expired',
  },
];

export const TAB_BY_ID = Object.fromEntries(
  TAB_DEFINITIONS.map((tab) => [tab.id, tab])
) as Record<TabId, NavTab>;
