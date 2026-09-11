import { Header } from '../../components/layout/Header';
import { StatCard } from '../../components/dashboard/StatCard';
import { ServiceHealth } from '../../components/dashboard/ServiceHealth';
import { LatencyRoute } from '../../components/dashboard/LatencyRoute';
import {
  TAB_BY_ID,
  INITIAL_STATS,
  INITIAL_SERVICES,
  INITIAL_LATENCY,
} from '../../data/mockData';

export default function DashboardPage() {
  return (
    <>
      <Header activeTabDef={TAB_BY_ID.dash} />

      <div className="p-8 pb-16 flex flex-col gap-6 max-w-7xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {INITIAL_STATS.map((stat, idx) => (
            <StatCard key={idx} stat={stat} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <ServiceHealth services={INITIAL_SERVICES} />
          <LatencyRoute latencyItems={INITIAL_LATENCY} />
        </div>
      </div>
    </>
  );
}
