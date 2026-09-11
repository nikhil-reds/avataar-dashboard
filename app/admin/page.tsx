import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/dashboard/StatCard';
import { ServiceHealth } from '@/components/dashboard/ServiceHealth';
import { LatencyRoute } from '@/components/dashboard/LatencyRoute';
import { TAB_BY_ID, TAB_DEFINITIONS } from '@/data/navigation';
import { getLatencyRoutes, getNavBadges, getServiceHealth, getStats } from '@/lib/dashboard';
import type { TabId } from '@/types';

export const dynamic = 'force-dynamic';

export default async function AdminConsolePage() {
  const [stats, services, latencyItems, badges] = await Promise.all([
    getStats(),
    getServiceHealth(),
    getLatencyRoutes(),
    getNavBadges(),
  ]);

  // Badge counts are read from the database rather than hardcoded in the nav config.
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
      {/* No onSelectTab, so the Sidebar renders links and each item opens its real route. */}
      <Sidebar tabs={tabs} />

      <main className="flex-1 min-w-0 flex flex-col">
        <Header activeTabDef={TAB_BY_ID.dash} />

        <div className="p-8 pb-16 flex flex-col gap-6 max-w-7xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <StatCard key={stat.label} stat={stat} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <ServiceHealth services={services} />
            <LatencyRoute latencyItems={latencyItems} />
          </div>
        </div>
      </main>
    </div>
  );
}
