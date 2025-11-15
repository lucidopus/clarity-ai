'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, TrendingUp, User, X, Check, Bell } from 'lucide-react';

interface Alert {
  id: string;
  type: 'STATISTICAL_OUTLIER' | 'USER_COST_SPIKE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED' | 'ARCHIVED';
  message: string;
  description: string;
  context: any;
  createdAt: string;
  updatedAt: string;
}

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'NEW' | 'ACKNOWLEDGED'>('NEW');

  useEffect(() => {
    fetchAlerts();
    // Poll for new alerts every 60 seconds
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const statusParam = filter === 'all' ? '' : `&status=${filter}`;
      const response = await fetch(`/api/admin/analytics/alerts?limit=10${statusParam}`);

      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }

      const data = await response.json();
      if (data.success) {
        setAlerts(data.alerts);
      } else {
        throw new Error(data.message || 'Failed to load alerts');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/admin/analytics/alerts/${alertId}/acknowledge`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to acknowledge alert');
      }

      // Refresh alerts
      fetchAlerts();
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'MEDIUM':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'LOW':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getAlertIcon = (type: string) => {
    if (type === 'STATISTICAL_OUTLIER') return <TrendingUp className="w-4 h-4" />;
    if (type === 'USER_COST_SPIKE') return <User className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading && alerts.length === 0) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-4">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent"></div>
          <span className="text-sm text-muted-foreground">Loading alerts...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-4">
        <div className="flex items-center space-x-2 text-red-500">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">Error loading alerts: {error}</span>
        </div>
      </div>
    );
  }

  const newAlerts = alerts.filter((a) => a.status === 'NEW');

  if (newAlerts.length === 0 && filter === 'NEW') {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
        <div className="flex items-center space-x-2 text-green-500">
          <Check className="w-5 h-5" />
          <span className="text-sm font-medium">No active alerts - All systems normal</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">Recent Alerts</h3>
          {newAlerts.length > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {newAlerts.length}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              filter === 'all' ? 'bg-accent text-white' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('NEW')}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              filter === 'NEW' ? 'bg-accent text-white' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            New
          </button>
          <button
            onClick={() => setFilter('ACKNOWLEDGED')}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              filter === 'ACKNOWLEDGED' ? 'bg-accent text-white' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Acknowledged
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length === 0 ? (
        <div className="bg-card-bg border border-border rounded-xl p-4 text-center text-sm text-muted-foreground">
          No alerts found
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.slice(0, 5).map((alert) => (
            <div
              key={alert.id}
              className={`border rounded-lg p-4 transition-all duration-200 ${getSeverityColor(
                alert.severity
              )} ${alert.status === 'NEW' ? 'shadow-md' : 'opacity-75'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="text-sm font-medium">{alert.message}</p>
                      <span className="px-1.5 py-0.5 bg-background/50 rounded text-xs font-medium">
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs opacity-80">{alert.description}</p>
                    <p className="text-xs opacity-60 mt-1">{formatDate(alert.createdAt)}</p>
                  </div>
                </div>
                {alert.status === 'NEW' && (
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="ml-2 p-1.5 hover:bg-background/50 rounded transition-colors"
                    title="Acknowledge"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                {alert.status === 'ACKNOWLEDGED' && (
                  <div className="ml-2 p-1.5">
                    <Check className="w-4 h-4 opacity-50" />
                  </div>
                )}
              </div>
            </div>
          ))}

          {alerts.length > 5 && (
            <button
              onClick={fetchAlerts}
              className="w-full py-2 text-sm text-accent hover:underline"
            >
              View all {alerts.length} alerts
            </button>
          )}
        </div>
      )}
    </div>
  );
}
