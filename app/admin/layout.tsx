import React from "react";
import type { Metadata } from "next";
import { Sidebar } from '@/components/layout/Sidebar';
import { TAB_DEFINITIONS } from '@/data/navigation';
import { getNavBadges } from '@/lib/dashboard';
import type { TabId } from '@/types';

export const metadata: Metadata = {
  title: "Rubenius · Avatar Commerce Admin",
  description:
    "Admin console for the avatar commerce pipeline: catalogue, ingest, renders and memory.",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const badges = await getNavBadges();

  const counts: Partial<Record<TabId, number>> = {
    conversations: badges.conversations,
    catalogue: badges.skusInReview,
    ingest: badges.ingestJobs,
    avatar: badges.renders,
  };

  const tabs = TAB_DEFINITIONS.map((tab) => ({
    ...tab,
    badge: counts[tab.id] ? String(counts[tab.id]) : '',
  }));

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-zinc-900 dark:text-zinc-100 transition-colors">
      <Sidebar tabs={tabs} />
      <main className="flex-1 min-w-0 flex flex-col">
        {children}
      </main>
    </div>
  );
}
