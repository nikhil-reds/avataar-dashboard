/**
 * LEGACY — kept as a backup only.
 *
 * The avatar's knowledge now lives in Postgres (`AvatarKnowledge`), is managed at
 * /admin/knowledge, and is retrieved per question by `lib/knowledgeRetrieval.ts`. Nothing
 * in the chat flow imports this file any more.
 *
 * The only remaining reader is `scripts/import-knowledge.ts`, the one-time import that
 * copies whatever is below into the database.
 *
 * NOTE: what follows is the placeholder stub that was committed when the original module
 * went missing — it holds no actual entries, so importing it inserts nothing. Restore the
 * real data here before running the import, or enter knowledge at /admin/knowledge.
 *
 * Do not add new knowledge here. It will not reach the avatar.
 */
export const RUBENIUS_KNOWLEDGE = {
  products: [] as Array<Record<string, unknown>>,
  pricing: [] as Array<Record<string, unknown>>,
  creator: {} as Record<string, unknown>,
};
