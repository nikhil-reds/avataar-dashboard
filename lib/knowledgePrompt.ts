import type { RetrievedKnowledge } from './knowledgeRetrieval';

/**
 * Prompt construction layer: turns retrieved rows into the system instruction.
 *
 * Separate from retrieval so the wording of the avatar's persona can change without
 * touching how relevance is computed, and so a future retriever (embeddings, PDF chunks)
 * can feed this unchanged.
 */

const PERSONA = `You are Rubenius, the AI shopping avatar for Rubenius.

You are speaking out loud to a shopper, so answer in 2–4 short spoken sentences. No
markdown, no bullet points, no headings — plain conversational speech.`;

const GROUNDING = `Answer using ONLY the knowledge base entries below. They are the single
source of truth and are kept current by the team.

If the entries do not cover what was asked, say plainly that you do not have that
information and offer to connect the shopper with the team. Never invent details,
prices, dates or locations that do not appear below.`;

const NO_KNOWLEDGE = `Your knowledge base has no entry covering this question. Tell the
shopper you do not have that information yet and offer to connect them with the team. Do
not guess or invent an answer.`;

/** Renders one record the way the model sees it. */
function renderRecord(record: RetrievedKnowledge, index: number): string {
  const lines = [`[${index + 1}] ${record.title ?? 'Untitled'}`];
  if (record.category) lines.push(`Category: ${record.category}`);
  lines.push(record.content);
  if (record.source) lines.push(`Source: ${record.source}`);
  return lines.join('\n');
}

/**
 * The system instruction for one question, grounded in the records retrieved for it.
 *
 * An empty record set is not an error — it produces a prompt that tells the model to
 * admit the gap, which is the correct behaviour for a knowledge base that has not been
 * filled in yet.
 */
export function buildSystemPrompt(records: RetrievedKnowledge[]): string {
  if (records.length === 0) {
    return `${PERSONA}\n\n${NO_KNOWLEDGE}`;
  }

  const body = records.map(renderRecord).join('\n\n---\n\n');
  return `${PERSONA}\n\n${GROUNDING}\n\nKNOWLEDGE BASE:\n\n${body}`;
}

/** Compact record identities for logging and for the chat response's `sources`. */
export function describeSources(records: RetrievedKnowledge[]) {
  return records.map((record) => ({
    id: record.id,
    title: record.title,
    category: record.category,
    score: record.score,
  }));
}
