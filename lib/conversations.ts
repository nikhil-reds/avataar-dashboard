import { Prisma, SessionStatus, SpeakerRole } from '@prisma/client';
import { prisma } from './db';
import { DEFAULT_PER_PAGE, type ConversationQuery } from './conversationQuery';

export function buildWhere(query: ConversationQuery): Prisma.ShopperSessionWhereInput {
  const where: Prisma.ShopperSessionWhereInput = {};

  if (query.status === 'live') where.status = SessionStatus.LIVE;
  if (query.status === 'ended') where.status = { in: [SessionStatus.ENDED, SessionStatus.ERROR] };

  if (query.from || query.to) {
    where.startedAt = {
      ...(query.from ? { gte: query.from } : {}),
      ...(query.to ? { lte: query.to } : {}),
    };
  }

  if (query.minTurns > 0) where.turnCount = { gte: query.minTurns };

  // Free text searches the transcript itself, not just metadata. Being able to ask
  // "who asked about gold rates?" is the whole reason for storing turns.
  if (query.q) {
    const contains = { contains: query.q, mode: Prisma.QueryMode.insensitive };
    where.OR = [
      { title: contains },
      { summary: contains },
      { id: contains },
      { avatarSessionId: contains },
      { turns: { some: { text: contains } } },
    ];
  }

  return where;
}

function buildOrderBy(query: ConversationQuery): Prisma.ShopperSessionOrderByWithRelationInput[] {
  // `id` is the tiebreaker. Without a stable secondary sort, rows holding equal values
  // can reshuffle between pages and a row gets silently skipped while paginating.
  if (query.sort === 'turnCount') return [{ turnCount: query.dir }, { id: 'asc' }];
  if (query.sort === 'durationSec') {
    return [{ durationSec: { sort: query.dir, nulls: 'last' } }, { id: 'asc' }];
  }
  return [{ startedAt: query.dir }, { id: 'asc' }];
}

export async function listConversations(query: ConversationQuery, perPage = DEFAULT_PER_PAGE) {
  const where = buildWhere(query);

  const [total, rows] = await Promise.all([
    prisma.shopperSession.count({ where }),
    prisma.shopperSession.findMany({
      where,
      orderBy: buildOrderBy(query),
      skip: (query.page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        title: true,
        summary: true,
        status: true,
        startedAt: true,
        endedAt: true,
        durationSec: true,
        turnCount: true,
        lastTurnAt: true,
        avatarSessionId: true,
      },
    }),
  ]);

  return { rows, total, pageCount: Math.max(1, Math.ceil(total / perPage)), perPage };
}

export type ConversationRow = Awaited<ReturnType<typeof listConversations>>['rows'][number];

export async function getConversation(id: string) {
  return prisma.shopperSession.findUnique({
    where: { id },
    include: {
      turns: { orderBy: { seq: 'asc' } },
      facts: { orderBy: { createdAt: 'asc' } },
    },
  });
}

export type ConversationDetail = NonNullable<Awaited<ReturnType<typeof getConversation>>>;
export type TurnRecord = ConversationDetail['turns'][number];

export interface Exchange {
  /** Null when the avatar spoke unprompted, e.g. its opening greeting. */
  question: TurnRecord | null;
  answers: TurnRecord[];
}

/**
 * Pair each shopper question with the avatar turns that followed it.
 *
 * Turns are stored individually rather than as question/answer pairs because the avatar
 * can answer across several utterances, be interrupted, or speak unprompted. Pairing at
 * render time keeps the stored record faithful to what actually happened.
 */
export function groupIntoExchanges(turns: TurnRecord[]): Exchange[] {
  const exchanges: Exchange[] = [];

  for (const turn of turns) {
    if (turn.who === SpeakerRole.SHOPPER) {
      exchanges.push({ question: turn, answers: [] });
      continue;
    }

    const current = exchanges[exchanges.length - 1];
    if (current) {
      current.answers.push(turn);
    } else {
      exchanges.push({ question: null, answers: [turn] });
    }
  }

  return exchanges;
}

