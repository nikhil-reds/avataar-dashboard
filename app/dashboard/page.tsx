import { Header } from '../../components/layout/Header';
import { StatCard } from '../../components/dashboard/StatCard';
import { ServiceHealth } from '../../components/dashboard/ServiceHealth';
import { LatencyRoute } from '../../components/dashboard/LatencyRoute';
import { TAB_BY_ID } from '../../data/navigation';
import { getLatencyRoutes, getServiceHealth, getStats } from '../../lib/dashboard';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [stats, services, latencyItems] = await Promise.all([
    getStats(),
    getServiceHealth(),
    getLatencyRoutes(),
  ]);

  return (
    <>
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
    </>
  );
}
