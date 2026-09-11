// Pure constants shared by client components. Kept free of the Prisma import so the
// database client is never pulled into the browser bundle.

export const LOG_KIND_FILTERS = ['all', 'chat', 'session', 'render', 'ingest'] as const;
export type LogKindFilter = (typeof LOG_KIND_FILTERS)[number];
