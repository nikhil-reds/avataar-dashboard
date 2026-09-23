import {
  FALLBACK_OPENING,
  getAvatarContextSnapshot,
  type AvatarContextSnapshot,
  type CachedKnowledge,
  type CachedSku,
} from './avatarContextCache';

const MAX_WORDS = 34;
const NO_ANSWER =
  "I don't have that information yet, but I can connect you with the team.";

const STOPWORDS = new Set([
  'a', 'about', 'am', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'can', 'do', 'does',
  'for', 'from', 'give', 'have', 'her', 'hi', 'hello', 'hey', 'how', 'i', 'in', 'is',
  'it', 'me', 'of', 'on', 'or', 'please', 'show', 'tell', 'that', 'the', 'this', 'to',
  'what', 'with', 'you', 'your',
]);

function terms(text: string) {
  return [
    ...new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length > 1 && !STOPWORDS.has(term))
    ),
  ].slice(0, 12);
}

function isGreeting(message: string) {
  return /^(hi|hello|hey|namaste|good\s+(morning|afternoon|evening))[\s!.]*$/i.test(message.trim());
}

function shorten(text: string, maxWords = MAX_WORDS) {
  const firstSentence = text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/)[0] ?? text;
  const words = firstSentence.split(/\s+/).filter(Boolean);
  const shortened = words.length > maxWords ? `${words.slice(0, maxWords).join(' ')}.` : firstSentence;
  return shortened.replace(/\s+/g, ' ').trim();
}

function countMatches(haystack: string, needles: string[]) {
  const normalized = haystack.toLowerCase();
  return needles.reduce((score, term) => score + (normalized.includes(term) ? 1 : 0), 0);
}

function scoreKnowledge(row: CachedKnowledge, queryTerms: string[]) {
  const title = row.title ?? '';
  const category = row.category ?? '';
  const keywordText = row.keywords.join(' ');
  return (
    countMatches(keywordText, queryTerms) * 5 +
    countMatches(title, queryTerms) * 3 +
    countMatches(category, queryTerms) * 2 +
    countMatches(row.content, queryTerms)
  );
}

function scoreSku(row: CachedSku, queryTerms: string[]) {
  const haystack = [
    row.sku,
    row.name,
    row.category,
    row.supplier ?? '',
    ...row.talkingPoints,
  ].join(' ');

  return (
    countMatches(row.sku, queryTerms) * 6 +
    countMatches(row.name, queryTerms) * 4 +
    countMatches(row.category, queryTerms) * 2 +
    countMatches(haystack, queryTerms)
  );
}

function skuAnswer(row: CachedSku) {
  const stock = row.stock > 0 ? `${row.stock} in stock` : 'currently out of stock';
  const point = row.talkingPoints[0] ? ` ${shorten(row.talkingPoints[0], 12)}` : '';
  return shorten(`${row.name} (${row.sku}) is a ${row.category} item, priced at ${row.price}, with ${stock}.${point}`);
}

function knowledgeAnswer(row: CachedKnowledge) {
  return shorten(row.content);
}

export interface RedisAnswer {
  response: string;
  source: 'opening' | 'knowledge' | 'catalogue' | 'none';
  context: {
    refreshedAt: string;
    knowledgeRows: number;
    catalogueRows: number;
    matchedId?: string;
  };
}

export function answerFromContext(snapshot: AvatarContextSnapshot, message: string): RedisAnswer {
  if (isGreeting(message)) {
    return {
      response: snapshot.openingStatement || FALLBACK_OPENING,
      source: 'opening',
      context: {
        refreshedAt: snapshot.refreshedAt,
        knowledgeRows: snapshot.knowledge.length,
        catalogueRows: snapshot.catalogue.length,
      },
    };
  }

  const queryTerms = terms(message);
  if (queryTerms.length === 0) {
    return {
      response: snapshot.openingStatement || FALLBACK_OPENING,
      source: 'opening',
      context: {
        refreshedAt: snapshot.refreshedAt,
        knowledgeRows: snapshot.knowledge.length,
        catalogueRows: snapshot.catalogue.length,
      },
    };
/* progress step 3 */
  }

  const bestKnowledge = snapshot.knowledge
    .map((row) => ({ row, score: scoreKnowledge(row, queryTerms) }))
    .sort((a, b) => b.score - a.score)[0];
  const bestSku = snapshot.catalogue
    .map((row) => ({ row, score: scoreSku(row, queryTerms) }))
    .sort((a, b) => b.score - a.score)[0];

  const knowledgeScore = bestKnowledge?.score ?? 0;
  const skuScore = bestSku?.score ?? 0;
  const baseContext = {
    refreshedAt: snapshot.refreshedAt,
    knowledgeRows: snapshot.knowledge.length,
    catalogueRows: snapshot.catalogue.length,
  };

  if (skuScore <= 0 && knowledgeScore <= 0) {
    return { response: NO_ANSWER, source: 'none', context: baseContext };
  }

  if (skuScore >= knowledgeScore && bestSku) {
    return {
      response: skuAnswer(bestSku.row),
      source: 'catalogue',
      context: { ...baseContext, matchedId: bestSku.row.id },
    };
  }

  return {
    response: knowledgeAnswer(bestKnowledge.row),
    source: 'knowledge',
    context: { ...baseContext, matchedId: bestKnowledge.row.id },
  };
}

export async function answerFromRedisContext(message: string): Promise<RedisAnswer> {
  const snapshot = await getAvatarContextSnapshot();
  return answerFromContext(snapshot, message);
}