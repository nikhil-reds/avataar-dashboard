// Hand-rolled request guards. These endpoints are reachable from any browser (the app
// has no auth yet), so every field is bounded before it reaches the database.

export const MAX_TURNS_PER_BATCH = 50;
export const MAX_TURN_TEXT = 4000;

export type SpeakerInput = 'SHOPPER' | 'AVATAR' | 'SYSTEM';

export interface TurnInput {
  eventId: string;
  seq: number;
  who: SpeakerInput;
  text: string;
  spokenAt: Date;
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown, field: string, max: number): Parsed<string | null> {
  if (value === undefined || value === null || value === '') return { ok: true, value: null };
  if (typeof value !== 'string') return { ok: false, error: `${field} must be a string` };
  const trimmed = value.trim();
  if (trimmed.length > max) return { ok: false, error: `${field} exceeds ${max} characters` };
  return { ok: true, value: trimmed || null };
}

export interface CreateSessionInput {
  avatarSessionId: string | null;
  locale: string | null;
}

export function parseCreateSession(body: unknown): Parsed<CreateSessionInput> {
  if (!isRecord(body)) return { ok: false, error: 'Body must be a JSON object' };

  const avatarSessionId = optionalString(body.avatarSessionId, 'avatarSessionId', 200);
  if (!avatarSessionId.ok) return avatarSessionId;

  const locale = optionalString(body.locale, 'locale', 20);
  if (!locale.ok) return locale;

  return { ok: true, value: { avatarSessionId: avatarSessionId.value, locale: locale.value } };
}

export function parseTurnsBatch(body: unknown): Parsed<TurnInput[]> {
  if (!isRecord(body)) return { ok: false, error: 'Body must be a JSON object' };
  if (!Array.isArray(body.turns)) return { ok: false, error: '`turns` must be an array' };
  if (body.turns.length === 0) return { ok: false, error: '`turns` must not be empty' };
  if (body.turns.length > MAX_TURNS_PER_BATCH) {
    return { ok: false, error: `turns exceeds ${MAX_TURNS_PER_BATCH} entries` };
  }

  const turns: TurnInput[] = [];

  for (const [index, raw] of body.turns.entries()) {
    if (!isRecord(raw)) return { ok: false, error: `turns[${index}] must be an object` };

    const { eventId, seq, who, text, spokenAt } = raw;

    if (typeof eventId !== 'string' || !eventId.trim()) {
      return { ok: false, error: `turns[${index}].eventId is required` };
    }
    if (typeof seq !== 'number' || !Number.isInteger(seq) || seq < 0) {
      return { ok: false, error: `turns[${index}].seq must be a non-negative integer` };
    }
    if (who !== 'SHOPPER' && who !== 'AVATAR' && who !== 'SYSTEM') {
      return { ok: false, error: `turns[${index}].who must be SHOPPER, AVATAR or SYSTEM` };
    }
    if (typeof text !== 'string' || !text.trim()) {
      return { ok: false, error: `turns[${index}].text is required` };
    }

    // Truncate rather than reject: losing the tail of one long utterance beats
    // dropping the whole batch and with it the surrounding conversation.
    const trimmed = text.trim().slice(0, MAX_TURN_TEXT);

    const when = typeof spokenAt === 'string' ? new Date(spokenAt) : new Date();
    if (Number.isNaN(when.getTime())) {
      return { ok: false, error: `turns[${index}].spokenAt is not a valid date` };
    }

    turns.push({ eventId: eventId.trim().slice(0, 200), seq, who, text: trimmed, spokenAt: when });
  }

  return { ok: true, value: turns };
}

export interface UpdateSessionInput {
  status: 'ENDED' | 'ERROR' | null;
  summary: string | null;
  endedAt: Date | null;
}

export function parseUpdateSession(body: unknown): Parsed<UpdateSessionInput> {
  if (!isRecord(body)) return { ok: false, error: 'Body must be a JSON object' };

  let status: UpdateSessionInput['status'] = null;
  if (body.status !== undefined && body.status !== null) {
    if (body.status !== 'ENDED' && body.status !== 'ERROR') {
      return { ok: false, error: 'status must be ENDED or ERROR' };
    }
    status = body.status;
  }

  const summary = optionalString(body.summary, 'summary', 2000);
  if (!summary.ok) return summary;

  let endedAt: Date | null = null;
  if (typeof body.endedAt === 'string') {
    const parsed = new Date(body.endedAt);
    if (Number.isNaN(parsed.getTime())) return { ok: false, error: 'endedAt is not a valid date' };
    endedAt = parsed;
  }

  return { ok: true, value: { status, summary: summary.value, endedAt } };
}

export interface SkuInput {
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  supplier: string | null;
  talkingPoints: string[];
}

export function parseSkuInput(body: unknown): Parsed<SkuInput> {
  if (!isRecord(body)) return { ok: false, error: 'Body must be a JSON object' };

  const required = (value: unknown, field: string, max: number): Parsed<string> => {
    if (typeof value !== 'string' || !value.trim()) {
      return { ok: false, error: `${field} is required` };
    }
    return { ok: true, value: value.trim().slice(0, max) };
  };

  const sku = required(body.sku, 'sku', 60);
  if (!sku.ok) return sku;

  const name = required(body.name, 'name', 200);
  if (!name.ok) return name;

  const category = required(body.category, 'category', 80);
  if (!category.ok) return category;

  const price = Number(body.price);
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, error: 'price must be a non-negative number' };
  }

  const stockRaw = body.stock === '' || body.stock === undefined ? 0 : Number(body.stock);
  if (!Number.isFinite(stockRaw) || stockRaw < 0 || !Number.isInteger(stockRaw)) {
    return { ok: false, error: 'stock must be a non-negative whole number' };
  }

  const supplier = optionalString(body.supplier, 'supplier', 200);
  if (!supplier.ok) return supplier;

  const talkingPoints = Array.isArray(body.talkingPoints)
    ? body.talkingPoints
        .filter((point): point is string => typeof point === 'string')
        .map((point) => point.trim())
        .filter(Boolean)
        .slice(0, 20)
        .map((point) => point.slice(0, 500))
    : [];

  return {
    ok: true,
    value: {
      sku: sku.value,
      name: name.value,
      category: category.value,
      price,
      stock: stockRaw,
      supplier: supplier.value,
      talkingPoints,
    },
  };
}

export const MAX_SOURCE_TITLE = 200;
export const MAX_PASTED_TEXT = 500_000;
export const MAX_SOURCES_PER_INDEX = 200;

export interface TextSourceInput {
  title: string;
  body: string;
}

/** Pasted text arriving as JSON at POST /api/ingest/sources. */
export function parseTextSource(body: unknown): Parsed<TextSourceInput> {
  if (!isRecord(body)) return { ok: false, error: 'Body must be a JSON object' };

  if (typeof body.body !== 'string' || !body.body.trim()) {
    return { ok: false, error: 'body is required' };
  }

  if (body.body.length > MAX_PASTED_TEXT) {
    return { ok: false, error: `body exceeds ${MAX_PASTED_TEXT} characters` };
  }

  const title = optionalString(body.title, 'title', MAX_SOURCE_TITLE);
  if (!title.ok) return title;

  return {
    ok: true,
    // Untitled text still needs a name to show in the queue and the index.
    value: { title: title.value ?? 'Untitled note', body: body.body },
  };
}

export interface IndexBuildInput {
  sourceIds: string[];
  label: string | null;
}

/** Build request for POST /api/ingest/index. */
export function parseIndexBuild(body: unknown): Parsed<IndexBuildInput> {
  if (!isRecord(body)) return { ok: false, error: 'Body must be a JSON object' };
  if (!Array.isArray(body.sourceIds)) {
    return { ok: false, error: '`sourceIds` must be an array' };
  }

  const sourceIds = body.sourceIds.filter(
    (id): id is string => typeof id === 'string' && id.trim().length > 0
  );

  if (sourceIds.length === 0) {
    return { ok: false, error: 'At least one source is required' };
  }

  if (sourceIds.length > MAX_SOURCES_PER_INDEX) {
    return { ok: false, error: `At most ${MAX_SOURCES_PER_INDEX} sources per build` };
  }

  // A repeated id would index the same document twice and break the doc ordinals.
  if (new Set(sourceIds).size !== sourceIds.length) {
    return { ok: false, error: 'sourceIds contains duplicates' };
  }

  const label = optionalString(body.label, 'label', 120);
  if (!label.ok) return label;

  return { ok: true, value: { sourceIds, label: label.value } };
}
