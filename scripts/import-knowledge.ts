/**
 * One-time import of the legacy static knowledge file into Postgres.
 *
 *   npx tsx scripts/import-knowledge.ts
 *
 * Safe to run more than once: every row it writes carries a stable `importKey` derived
 * from where the entry sat in the file, and the write is an upsert on that key. A second
 * run refreshes what it wrote the first time instead of duplicating it.
 *
 * This is the only place left that reads `app/constants/knowledge.ts`. The avatar does
 * not — it reads the database.
 */
import 'dotenv/config';
import { PrismaClient } from '../app/generated/prisma';
import { RUBENIUS_KNOWLEDGE } from '../app/constants/knowledge';

const prisma = new PrismaClient();

interface StagedEntry {
  importKey: string;
  title: string;
  content: string;
  category: string;
  keywords: string[];
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function titleCase(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

/** Renders a value as a line of prose the avatar could reasonably speak. */
function stringify(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(stringify).filter(Boolean).join(', ');
  if (isRecord(value)) {
    return Object.entries(value)
      .map(([key, nested]) => {
        const rendered = stringify(nested);
        return rendered ? `${titleCase(key)}: ${rendered}` : '';
      })
      .filter(Boolean)
      .join('\n');
  }
  return String(value);
}

function keywordsFor(item: Record<string, unknown>, title: string, category: string): string[] {
  const explicit = [item.keywords, item.tags]
    .flatMap((value) => (Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []))
    .map((value) => String(value).trim().toLowerCase())
    .filter(Boolean);

  // Words from the title are what a shopper is most likely to actually say.
  const fromTitle = title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);

  return [...new Set([...explicit, ...fromTitle, category])].slice(0, 30);
}

/** Flattens the legacy object into one staged row per entry. */
function stage(): StagedEntry[] {
  const staged: StagedEntry[] = [];
  const source = RUBENIUS_KNOWLEDGE as unknown as Record<string, unknown>;

  for (const [section, value] of Object.entries(source)) {
    const category = slug(section) || 'general';

    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        const item: Record<string, unknown> = isRecord(entry) ? entry : { value: entry };
        const title =
          [item.name, item.title, item.label, item.sku]
            .find((candidate) => typeof candidate === 'string' && candidate.trim()) ??
          `${titleCase(section)} ${index + 1}`;

        const content = stringify(item).trim();
        if (!content) return;

        staged.push({
          importKey: `knowledge.ts:${category}:${slug(String(title)) || index}`,
          title: String(title),
          content,
          category,
          keywords: keywordsFor(item, String(title), category),
        });
      });
      continue;
    }

    // A non-array section (the `creator` block) becomes a single entry.
    const content = stringify(value).trim();
    if (!content) continue;

    const title = titleCase(section);
    staged.push({
      importKey: `knowledge.ts:${category}`,
      title,
      content,
      category,
      keywords: keywordsFor(isRecord(value) ? value : {}, title, category),
    });
  }

  return staged;
}

async function main() {
  const entries = stage();

  if (entries.length === 0) {
    console.log(
      'Nothing to import: app/constants/knowledge.ts holds no entries.\n' +
        'It is the placeholder stub, not the original data file. Add entries through ' +
        '/api/knowledge, or restore the real file and re-run this.'
    );
    return;
  }

  let created = 0;
  let updated = 0;

  for (const entry of entries) {
    const existing = await prisma.avatarKnowledge.findUnique({
      where: { importKey: entry.importKey },
      select: { id: true },
    });

    await prisma.avatarKnowledge.upsert({
      where: { importKey: entry.importKey },
      create: { ...entry, source: 'app/constants/knowledge.ts' },
      // Only the content fields are refreshed — an entry an admin has since deactivated
      // stays deactivated rather than being silently switched back on.
      update: {
        title: entry.title,
        content: entry.content,
        category: entry.category,
        keywords: entry.keywords,
      },
    });

    if (existing) updated++;
    else created++;
  }

  console.log(`Imported ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}: ${created} created, ${updated} refreshed.`);
}

main()
  .catch((err) => {
    console.error('Import failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
