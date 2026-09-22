'use client';

import {
  AudioLines,
  Boxes,
  Brain,
  DatabaseZap,
  FileSearch,
  GitBranch,
  LockKeyhole,
  MessageCircle,
  Radio,
  Sparkles,
} from 'lucide-react';

const ITEMS = [
  {
    icon: MessageCircle,
    title: 'Cached buffer audio',
    body: 'Buffer phrase selection is local and can return pre-generated audio before TTS or LLM starts.',
  },
  {
    icon: Sparkles,
    title: 'Persona controlled',
    body: 'Opening intro, persona and instructions come from this admin page and are cached for the agent.',
  },
  {
    icon: FileSearch,
    title: 'Small PDF context',
    body: 'PDF ingest/page-index contributes only the top matching snippets, never whole documents.',
  },
  {
    icon: Boxes,
    title: 'Catalogue facts',
    body: 'Live catalogue SKUs are compacted into a searchable cache and only matching products are sent.',
  },
  {
    icon: Radio,
    title: 'Streamed answer',
    body: 'The agent endpoint emits buffer, context, token deltas and done events instead of waiting.',
  },
  {
    icon: GitBranch,
    title: 'Turn state machine',
    body: 'Turns report transcript, buffering, thinking, streaming, done and interrupted states for reliable orchestration.',
  },
  {
    icon: DatabaseZap,
    title: 'Redis hot path',
    body: 'Persona, catalogue, source snippets, query context and memory read from Redis-compatible cache first.',
  },
  {
    icon: LockKeyhole,
    title: 'Session lock',
    body: 'A short-lived per-session lock prevents overlapping turns from corrupting memory or transcript order.',
  },
  {
    icon: Brain,
    title: 'Budgeted memory',
    body: 'Recent memory is capped, cached with a 48-hour TTL and never allowed to expand the prompt unbounded.',
  },
  {
    icon: AudioLines,
    title: 'HeyGen LITE ready',
    body: 'LiveAvatar token API now supports LITE mode for backend-owned streamed audio orchestration.',
  },
] as const;

export function AgentPipelineOverview() {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
          Agent pipeline overview
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          The live answer path is optimized for fast speech, compact context and cached memory.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="rounded-lg border border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-950/35"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {item.title}
                </h3>
              </div>
              <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                {item.body}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
