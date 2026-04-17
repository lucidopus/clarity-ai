'use client';

import { useCallback, useState } from 'react';
import { LayoutDashboard, BarChart3, Users as UsersIcon } from 'lucide-react';

import OverviewTab from '@/components/admin/costs/OverviewTab';
import BreakdownTab from '@/components/admin/costs/BreakdownTab';
import TopUsersByCostTable from '@/components/admin/costs/TopUsersByCostTable';
import TimeRangeSelector, {
  TimeRangeDays,
} from '@/components/admin/costs/shared/TimeRangeSelector';
import RefreshControl from '@/components/admin/costs/shared/RefreshControl';

type TabId = 'overview' | 'breakdown' | 'spenders';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" aria-hidden="true" /> },
  { id: 'breakdown', label: 'Breakdown', icon: <BarChart3 className="w-4 h-4" aria-hidden="true" /> },
  { id: 'spenders', label: 'Top Spenders', icon: <UsersIcon className="w-4 h-4" aria-hidden="true" /> },
];

export default function CostsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [days, setDays] = useState<TimeRangeDays>(30);
  const [refreshToken, setRefreshToken] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshToken((t) => t + 1);
  }, []);

  const handleDaysChange = useCallback((next: TimeRangeDays) => {
    setRefreshing(true);
    setDays(next);
  }, []);

  // Memoized so child components that list `onDataLoaded` in their fetch
  // useCallback deps don't recreate their fetcher on every parent render —
  // that caused an infinite fetch loop (onDataLoaded setState → re-render →
  // new callback identity → new fetcher → useEffect re-fires → fetch again).
  const handleDataLoaded = useCallback(() => {
    setLastUpdated(new Date());
    setRefreshing(false);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Costs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Spend, efficiency, and wasted-COGS signals for the last {days} days.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TimeRangeSelector days={days} onChange={handleDaysChange} />
          <RefreshControl onRefresh={handleRefresh} lastUpdated={lastUpdated} loading={refreshing} />
        </div>
      </div>

      <div className="border-b border-border">
        <div role="tablist" aria-label="Cost views" className="flex space-x-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              id={`costs-tab-${tab.id}`}
              type="button"
              aria-selected={activeTab === tab.id}
              aria-controls={`costs-tabpanel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                activeTab === tab.id
                  ? 'border-accent text-accent font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div
        role="tabpanel"
        id="costs-tabpanel-overview"
        aria-labelledby="costs-tab-overview"
        hidden={activeTab !== 'overview'}
      >
        {activeTab === 'overview' && (
          <OverviewTab days={days} refreshToken={refreshToken} onDataLoaded={handleDataLoaded} />
        )}
      </div>

      <div
        role="tabpanel"
        id="costs-tabpanel-breakdown"
        aria-labelledby="costs-tab-breakdown"
        hidden={activeTab !== 'breakdown'}
      >
        {activeTab === 'breakdown' && (
          <BreakdownTab days={days} refreshToken={refreshToken} onDataLoaded={handleDataLoaded} />
        )}
      </div>

      <div
        role="tabpanel"
        id="costs-tabpanel-spenders"
        aria-labelledby="costs-tab-spenders"
        hidden={activeTab !== 'spenders'}
      >
        {activeTab === 'spenders' && (
          <TopUsersByCostTable days={days} refreshToken={refreshToken} onDataLoaded={handleDataLoaded} />
        )}
      </div>
    </div>
  );
}
