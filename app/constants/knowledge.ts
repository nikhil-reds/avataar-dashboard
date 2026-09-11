/**
 * Knowledge base injected into the Gemini system prompt by `app/api/chat/route.ts`.
 *
 * PLACEHOLDER — the module this route imports was missing from the repository, which
 * broke `next build`. The shape below matches how the route consumes it (serialised
 * wholesale into the prompt). Fill in the real content before relying on /api/chat.
 */
export const RUBENIUS_KNOWLEDGE = {
  products: [] as Array<Record<string, unknown>>,
  pricing: [] as Array<Record<string, unknown>>,
  creator: {} as Record<string, unknown>,
};
