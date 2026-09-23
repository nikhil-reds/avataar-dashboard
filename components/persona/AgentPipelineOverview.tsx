'use client';

import { AudioLines, Brain, DatabaseZap, FileSearch } from 'lucide-react';

const ITEMS = [
  { icon: DatabaseZap, title: 'Publish to Redis', body: 'Publish saves a full snapshot of your intro, persona, instructions and extracted source text in Docker Redis.' },
  { icon: AudioLines, title: 'Opening intro', body: 'The published intro becomes the HeyGen context greeting. Reconnect to hear the latest version.' },
  { icon: FileSearch, title: 'Saved sources', body: 'All saved sources with usable text are included. Sources awaiting extraction or marked failed are listed as excluded.' },
  { icon: Brain, title: 'HeyGen context', body: 'A versioned context carries your persona, instructions and sources to HeyGen. New sessions use it with your configured voice and model.' },
] as const;

export function AgentPipelineOverview() {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <div className="mb-4 flex flex-col gap-1">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
          Agent pipeline overview
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Publish → Docker Redis → HeyGen context → conversation.
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
/* progress step 4 */
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