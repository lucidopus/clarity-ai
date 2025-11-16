'use client';

import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface UserCost {
  userId: string;
  userName: string;
  email: string;
  totalCost: number;
}

export default function TopUsersByCostreTable() {
  const [users, setUsers] = useState<UserCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics/costs/users?limit=${limit}`);

      if (!response.ok) {
        throw new Error('Failed to fetch user costs');
      }

      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      } else {
        throw new Error(data.message || 'Failed to load data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatCost = (cost: number) => `$${cost.toFixed(4)}`;

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-6">
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-6">
        <div className="flex items-center space-x-2 text-red-500">
          <AlertCircle className="w-5 h-5" />
          <span>Error loading user costs: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Top Spenders</h3>
        <select
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value))}
          className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="10">Top 10</option>
          <option value="25">Top 25</option>
          <option value="50">Top 50</option>
          <option value="100">Top 100</option>
        </select>
      </div>

      <div className="bg-card-bg border border-border rounded-xl overflow-hidden">
        {users.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">No user cost data available</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background/50">
                <tr>
                  <th className="text-left text-xs font-medium text-muted-foreground py-3 px-6">Rank</th>
                  <th className="text-left text-xs font-medium text-muted-foreground py-3 px-6">User</th>
                  <th className="text-right text-xs font-medium text-muted-foreground py-3 px-6">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, idx) => (
                  <tr
                    key={user.userId}
                    className="border-t border-border"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        {idx < 3 ? (
                          <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-accent">{idx + 1}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">{idx + 1}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                          <span className="text-sm font-medium text-accent">{getInitials(user.userName)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{user.userName}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="text-sm font-semibold text-foreground">{formatCost(user.totalCost)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
