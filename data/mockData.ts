import {
  NavTab,
  StatItem,
  ServiceHealthItem,
  LatencyItem,
  LogRow,
  SkuRow,
  IngestJob,
  ReviewRow,
  SessionItem,
  AvatarRender,
} from '../types';

export const TAB_DEFINITIONS: NavTab[] = [
  {
    id: 'dash',
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
    label: 'Activity logs',
    badge: '18',
    crumb: 'observability',
    title: 'Activity & request logs',
    subtitle:
      'Every turn the avatar handled, with the model that answered it and where the time went.',
    cta: 'Export CSV',
  },
  {
    id: 'catalogue',
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
    label: 'PDF ingest',
    badge: '3',
    crumb: 'content',
    title: 'PDF ingest & scrape review',
    subtitle:
      'Upload supplier documents, watch extraction, and approve rows before they reach the catalogue.',
    cta: 'Upload PDF',
  },
  {
    id: 'manual',
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
    label: 'Avatar studio',
    badge: '2',
    crumb: 'avatar',
    title: 'Avatar & video generation',
    subtitle:
      'Full-body Indian persona rendered through HeyGen. Compose a script, pick a voice, queue the render.',
    cta: 'New render',
  },
  {
    id: 'memory',
    label: 'Memory',
    badge: '',
    crumb: 'avatar',
    title: 'Conversational memory',
    subtitle:
      'Rolling context window per shopper. Facts and transcripts expire automatically once the window closes.',
    cta: 'Purge expired',
  },
];

export const INITIAL_STATS: StatItem[] = [
  {
    label: 'sessions today',
    value: '342',
    delta: '+18% vs yesterday',
    deltaColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    label: 'avg first token',
    value: '0.9s',
    delta: 'local route · Gemini 1.4s',
    deltaColor: 'text-zinc-500 dark:text-zinc-400',
  },
  {
    label: 'videos rendered',
    value: '87',
    delta: '3 failed on quota',
    deltaColor: 'text-rose-600 dark:text-rose-400',
  },
  {
    label: 'catalogue SKUs',
    value: '4,218',
    delta: '26 awaiting review',
    deltaColor: 'text-amber-600 dark:text-amber-400',
  },
];

export const INITIAL_SERVICES: ServiceHealthItem[] = [
  {
    name: 'Local LLM (vLLM)',
    note: '8B · 4-bit · single A10',
    metric: '12.3 tok/s',
    color: '#10b981',
  },
  {
    name: 'Gemini fallback',
    note: 'used on low-confidence turns',
    metric: '22% of turns',
    color: '#10b981',
  },
  {
    name: 'Retrieval index',
    note: '4,218 chunks · bge-small',
    metric: '41ms p95',
    color: '#10b981',
  },
  {
    name: 'HeyGen renders',
    note: 'quota 913 / 1000 min',
    metric: '38s avg',
    color: '#f59e0b',
  },
  {
    name: 'Memory store (Redis)',
    note: 'retention 48h',
    metric: '1,106 keys',
    color: '#10b981',
  },
];

export const INITIAL_LATENCY: LatencyItem[] = [
  {
    name: 'Local LLM · reply',
    readout: '890 / 1,420 ms',
    pct: '44%',
    color: '#4f46e5',
  },
  {
    name: 'Gemini · reply',
    readout: '1,400 / 2,600 ms',
    pct: '68%',
    color: '#0284c7',
  },
  {
    name: 'Retrieval',
    readout: '18 / 41 ms',
    pct: '12%',
    color: '#0d9488',
  },
  {
    name: 'HeyGen render',
    readout: '34,000 / 61,000 ms',
    pct: '92%',
    color: '#d97706',
  },
];

export const INITIAL_LOG_ROWS: LogRow[] = [
  {
    time: '14:07:52',
    event: '“Show me bridal sets under 80k”',
    session: 'sess_9f21',
    model: 'local',
    latency: '0.9s',
    kind: 'chat',
    status: 'answered',
  },
  {
    time: '14:06:11',
    event: 'HeyGen render completed · greeting_v4',
    session: 'sess_9f21',
    model: 'heygen',
    latency: '38s',
    kind: 'render',
    status: 'delivered',
  },
  {
    time: '14:04:48',
    event: 'Retrieval miss → Gemini fallback',
    session: 'sess_9e77',
    model: 'gemini',
    latency: '1.6s',
    kind: 'chat',
    status: 'escalated',
  },
  {
    time: '13:58:20',
    event: 'PDF extract · kalyan_pricelist_sep.pdf',
    session: 'job_0412',
    model: 'ocr',
    latency: '12s',
    kind: 'ingest',
    status: '14 rows pending review',
  },
  {
    time: '13:51:02',
    event: '“Is the 22k chain in stock in Kochi?”',
    session: 'sess_9e77',
    model: 'local',
    latency: '1.1s',
    kind: 'chat',
    status: 'answered',
  },
  {
    time: '13:47:31',
    event: 'Memory write · budget = ₹80,000',
    session: 'sess_9f21',
    model: 'local',
    latency: '0.2s',
    kind: 'chat',
    status: 'stored 48h',
  },
  {
    time: '13:40:09',
    event: 'HeyGen render failed · quota',
    session: 'sess_9d10',
    model: 'heygen',
    latency: '—',
    kind: 'render',
    status: 'error',
  },
  {
    time: '13:33:55',
    event: 'Manual entry · SKU RB-2214 updated',
    session: 'admin_ad',
    model: '—',
    latency: '0.1s',
    kind: 'ingest',
    status: 'indexed',
  },
];

export const INITIAL_SKU_ROWS: SkuRow[] = [
  {
    sku: 'RB-2214',
    name: 'Temple-work gold choker, 22k',
    category: 'Necklaces',
    price: '₹1,42,500',
    source: 'PDF · Sep list',
    state: 'live',
  },
  {
    sku: 'RB-2251',
    name: 'Polki bridal set with jhumkas',
    category: 'Bridal sets',
    price: '₹3,18,000',
    source: 'PDF · Sep list',
    state: 'live',
  },
  {
    sku: 'RB-1180',
    name: 'Diamond solitaire ring, 0.75ct',
    category: 'Rings',
    price: '₹2,05,000',
    source: 'Manual',
    state: 'live',
  },
  {
    sku: 'RB-3302',
    name: 'Antique-finish kada, pair',
    category: 'Bangles',
    price: '₹96,400',
    source: 'PDF · Aug list',
    state: 'review',
  },
  {
    sku: 'RB-3311',
    name: 'Rose-gold everyday chain, 18k',
    category: 'Chains',
    price: '₹41,200',
    source: 'Manual',
    state: 'live',
  },
  {
    sku: 'RB-4090',
    name: 'Kundan maang tikka',
    category: 'Head',
    price: '₹58,900',
    source: 'PDF · Sep list',
    state: 'review',
  },
  {
    sku: 'RB-4120',
    name: 'Silver anklet, oxidised',
    category: 'Anklets',
    price: '₹7,850',
    source: 'Manual',
    state: 'draft',
  },
];

export const INITIAL_INGEST_JOBS: IngestJob[] = [
  {
    file: 'kalyan_pricelist_sep.pdf',
    state: 'done',
    pct: '100%',
    note: '128 rows · 14 need review',
    page: 3,
  },
  {
    file: 'bridal_collection_specs.pdf',
    state: 'extracting',
    pct: '62%',
    note: 'page 18 of 29 · tables detected',
    page: 18,
  },
  {
    file: 'supplier_terms_q3.pdf',
    state: 'queued',
    pct: '8%',
    note: 'waiting on OCR worker',
    page: 1,
  },
  {
    file: 'old_scan_2019.pdf',
    state: 'failed',
    pct: '34%',
    note: 'scanned at 150dpi — text layer missing',
    page: 6,
  },
];

export const INITIAL_REVIEW_ROWS: ReviewRow[] = [
  {
    name: 'Temple-work gold choker, 22k',
    conf: '0.94',
    fields: [
      { k: 'sku', v: 'RB-2214' },
      { k: 'price', v: '₹1,42,500' },
      { k: 'weight', v: '38.2 g' },
      { k: 'making', v: '12%' },
    ],
  },
  {
    name: 'Polki bridal set with jhumkas',
    conf: '0.88',
    fields: [
      { k: 'sku', v: 'RB-2251' },
      { k: 'price', v: '₹3,18,000' },
      { k: 'weight', v: '76.5 g' },
      { k: 'making', v: '15%' },
    ],
  },
  {
    name: 'Antique-finish kada (pair)',
    conf: '0.61',
    fields: [
      { k: 'sku', v: 'RB-3302' },
      { k: 'price', v: '₹96,400?' },
      { k: 'weight', v: '—' },
      { k: 'making', v: '10%' },
    ],
  },
  {
    name: 'Kundan maang tikka',
    conf: '0.52',
    fields: [
      { k: 'sku', v: 'RB-40??' },
      { k: 'price', v: '₹58,900' },
      { k: 'weight', v: '11.0 g' },
      { k: 'making', v: '—' },
    ],
  },
];

export const INITIAL_SESSIONS: SessionItem[] = [
  {
    name: 'Walk-in · Kochi store',
    summary: 'Bridal budget ₹80k, prefers 22k gold',
    ttl: '31h left',
    fresh: true,
    turns: [
      {
        who: 'shopper',
        text: 'We are looking for something for a wedding in November.',
        time: '13:44',
      },
      {
        who: 'avatar',
        text: 'Congratulations! Is this for the bride herself, and do you have a budget in mind?',
        time: '13:44',
      },
      {
        who: 'shopper',
        text: 'For the bride. Around eighty thousand, and she likes 22k.',
        time: '13:45',
      },
      {
        who: 'avatar',
        text: 'Noted — ₹80,000 and 22k gold. I have three bridal chokers in that range; shall I show them?',
        time: '13:45',
      },
    ],
    facts: [
      { k: 'budget', v: '₹80,000', exp: 'in 31h' },
      { k: 'purity preference', v: '22k gold', exp: 'in 31h' },
      { k: 'occasion', v: 'Wedding · November', exp: 'in 31h' },
      { k: 'store', v: 'Kochi · MG Road', exp: 'in 31h' },
    ],
  },
  {
    name: 'Returning · sess_9e77',
    summary: 'Asked about Kochi stock twice',
    ttl: '8h left',
    fresh: false,
    turns: [
      {
        who: 'shopper',
        text: 'Is the 22k chain in stock in Kochi?',
        time: '13:51',
      },
      {
        who: 'avatar',
        text: 'Yes — two pieces of RB-3311 are at the Kochi counter. Want me to hold one?',
        time: '13:51',
      },
    ],
    facts: [
      { k: 'sku interest', v: 'RB-3311', exp: 'in 8h' },
      { k: 'store', v: 'Kochi · MG Road', exp: 'in 8h' },
    ],
  },
  {
    name: 'Kiosk · Bengaluru',
    summary: 'Browsing rings, no budget stated',
    ttl: '44h left',
    fresh: true,
    turns: [
      { who: 'shopper', text: 'Show me solitaire rings.', time: '12:10' },
      {
        who: 'avatar',
        text: 'Here are three solitaires from 0.5ct upward. Any particular setting you like?',
        time: '12:10',
      },
    ],
    facts: [{ k: 'category interest', v: 'Rings · solitaire', exp: 'in 44h' }],
  },
  {
    name: 'Walk-in · Chennai',
    summary: 'Expired — purged at 14:00',
    ttl: 'expired',
    fresh: false,
    turns: [
      {
        who: 'avatar',
        text: "This session's transcript has been purged by the retention policy.",
        time: '14:00',
      },
    ],
    facts: [],
  },
];

export const INITIAL_RENDERS: AvatarRender[] = [
  {
    script: 'Namaste! Welcome to the Kochi showroom.',
    voice: 'Hindi–EN',
    length: '0:12',
    state: 'done',
  },
  {
    script: 'Three bridal chokers under ₹80,000…',
    voice: 'Hindi–EN',
    length: '0:34',
    state: 'rendering',
  },
  {
    script: 'Festive offer — 10% off making charges',
    voice: 'Tamil',
    length: '0:20',
    state: 'queued',
  },
  {
    script: 'Store timings and directions',
    voice: 'English IN',
    length: '0:15',
    state: 'failed',
  },
];
