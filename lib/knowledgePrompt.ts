import type { RetrievedKnowledge } from './knowledgeRetrieval';

/**
 * Prompt construction layer: turns retrieved rows into the system instruction.
 *
 * Separate from retrieval so the wording of the avatar's persona can change without
 * touching how relevance is computed, and so a future retriever (embeddings, PDF chunks)
 * can feed this unchanged.
 */

// Answer length is the main latency lever: the model decodes at roughly 12 tokens a
// second, so every extra sentence is close to another second of the shopper waiting in
// silence. One or two sentences is also simply how people answer a spoken question.
// Small models follow a demonstration far more reliably than a negative instruction, and
// qwen3:0.6b in particular will otherwise open its reply by repeating the question — which
// the avatar then says out loud. The example costs ~40 prefill tokens, about 20ms, against
// a decode phase measured in seconds.
const PERSONA = `You are Rubenius, the AI shopping avatar for Rubenius.

You are speaking out loud to a shopper. Answer in ONE short sentence, two at most, and
never more than 40 words. Plain conversational speech — no markdown, no bullet points, no
headings.

Never begin by repeating the shopper's question. Give only the answer itself.

Example of the required style:
Shopper: What time do you close on Fridays?
You: We close at 6pm on Fridays.

Note how the reply states the fact directly and does not repeat the question. The example
shows the *style* only — never borrow its wording, and never treat it as a reason to say
you lack information when the knowledge base below does cover the question.`;

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

/**
 * Spoken when the model returns nothing usable — an empty reply, or one that was only the
 * shopper's own question repeated back. Lives here with the rest of the persona wording
 * rather than in the generation layer.
 */
export const FALLBACK_SPOKEN_REPLY =
  "I don't have that information — let me connect you with the team.";
