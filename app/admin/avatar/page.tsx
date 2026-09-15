import { Header } from '@/components/layout/Header';
import { AvatarPreview } from '@/components/avatar/AvatarPreview';
import { RenderComposer } from '@/components/avatar/RenderComposer';
import { RenderQueue } from '@/components/avatar/RenderQueue';
import { TAB_BY_ID } from '@/data/navigation';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const VOICES = ['Hindi–English (Meera)', 'English IN (Meera)', 'Tamil (Anitha)'];

export default async function AvatarStudioPage() {
  const renders = await prisma.avatarRender.findMany({
    orderBy: { createdAt: 'desc' },
    take: 40,
  });

  return (
    <>
      <Header activeTabDef={TAB_BY_ID.avatar} />

      <div className="p-8 pb-16 flex flex-col gap-6 max-w-7xl">
        <div className="font-mono text-[10.5px] tracking-widest uppercase text-zinc-400 font-semibold flex items-center gap-1.5 mb-2">
          <span>apps</span>
          <span>/</span>
          <span className="text-indigo-600 dark:text-indigo-400 font-bold">
            {TAB_BY_ID.avatar.crumb}
          </span>
        </div>
        <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
          No render worker is configured. Queued requests are stored and listed below,
          but nothing processes them into video yet.
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
          <AvatarPreview voiceLabel={VOICES[0]} />

          <div className="flex flex-col gap-6">
            <RenderComposer voices={VOICES} />
            <RenderQueue renders={renders} />
          </div>
        </div>
      </div>
    </>
  );
}

