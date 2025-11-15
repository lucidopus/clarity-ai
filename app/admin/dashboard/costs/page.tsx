'use client';

import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Activity, Server, Users as UsersIcon } from 'lucide-react';

// Import components (to be created)
import CostSummaryCards from '@/components/admin/costs/CostSummaryCards';
import ModelComparisonChart from '@/components/admin/costs/ModelComparisonChart';
import TopUsersByCostreTable from '@/components/admin/costs/TopUsersByCostreTable';
import FeatureBreakdownChart from '@/components/admin/costs/FeatureBreakdownChart';
import TokenTrendChart from '@/components/admin/costs/TokenTrendChart';
import ServiceEfficiencyChart from '@/components/admin/costs/ServiceEfficiencyChart';
import SpendingHeatmap from '@/components/admin/costs/SpendingHeatmap';
import AlertsPanel from '@/components/admin/costs/AlertsPanel';

export default function CostsPage() {
  const [activeTab, setActiveTab] = useState<string>('summary');

  const tabs = [
    { id: 'summary', label: 'Summary', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'models', label: 'Models', icon: <Activity className="w-4 h-4" /> },
    { id: 'users', label: 'Users', icon: <UsersIcon className="w-4 h-4" /> },
    { id: 'services', label: 'Services', icon: <Server className="w-4 h-4" /> },
    { id: 'trends', label: 'Trends', icon: <TrendingUp className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Cost Analytics</h2>
          <p className="text-muted-foreground mt-1">
            Monitor spending, detect anomalies, and optimize resource usage
          </p>
        </div>
      </div>

      {/* Alerts Panel */}
      <AlertsPanel />

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <div className="flex space-x-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors duration-200 ${
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

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'summary' && (
          <>
            <CostSummaryCards />
            <FeatureBreakdownChart />
          </>
        )}

        {activeTab === 'models' && (
          <>
            <ModelComparisonChart />
          </>
        )}

        {activeTab === 'users' && (
          <>
            <TopUsersByCostreTable />
          </>
        )}

        {activeTab === 'services' && (
          <>
            <ServiceEfficiencyChart />
          </>
        )}

        {activeTab === 'trends' && (
          <>
            <TokenTrendChart />
            <SpendingHeatmap />
          </>
        )}
      </div>
    </div>
  );
}
