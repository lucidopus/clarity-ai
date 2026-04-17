'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Download, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getUserFriendlyMessage } from '@/lib/utils/user-error';
import { formatCost, formatCount } from '@/lib/cost/format';
import CostSkeleton from './shared/CostSkeleton';

interface UserCost {
  userId: string;
  userName: string;
  email: string;
  totalCost: number;
  wastedCost: number;
  operations: number;
  lastActive: string | null;
}

interface TopUsersByCostTableProps {
  days: number;
  refreshToken?: number;
  onDataLoaded?: () => void;
}

// Ranked table of the heaviest cost-accruing users for the selected window.
// Rows deep-link to the existing user drawer via `?userId=` on the admin
// users page, and admins can export the visible table to CSV so they can
// bring the numbers into a spreadsheet for finance review.
export default function TopUsersByCostTable({ days, refreshToken = 0, onDataLoaded }: TopUsersByCostTableProps) {
  const [users, setUsers] = useState<UserCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(10);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics/costs/users?limit=${limit}&days=${days}`);
      if (!response.ok) throw new Error('Failed to fetch user costs');
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
        onDataLoaded?.();
      } else {
        throw new Error(data.message || 'Failed to load data');
      }
    } catch (err) {
      setError(getUserFriendlyMessage(err, "We couldn't load the top users table."));
    } finally {
      setLoading(false);
    }
  }, [limit, days, onDataLoaded]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, refreshToken]);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const handleExportCsv = () => {
    const header = ['Rank', 'Name', 'Email', 'Total Cost (USD)', 'Wasted (USD)', 'Operations', 'Last Active (ISO)'];
    const rows = users.map((u, idx) => [
      String(idx + 1),
      csvEscape(u.userName),
      csvEscape(u.email),
      u.totalCost.toFixed(6),
      u.wastedCost.toFixed(6),
      String(u.operations),
      u.lastActive ?? '',
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `top-spenders-${days}d-top${limit}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) return <CostSkeleton variant="table" rows={limit} />;

  if (error) {
    return (
      <div className="bg-card-bg border border-border rounded-xl p-6" role="alert">
        <div className="flex items-center space-x-2 text-red-500">
          <AlertCircle className="w-5 h-5" aria-hidden="true" />
          <span>Error loading user costs: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-foreground">Top Spenders</h3>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="top-users-limit">Rows to display</label>
          <select
            id="top-users-limit"
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value, 10))}
            className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="10">Top 10</option>
            <option value="25">Top 25</option>
            <option value="50">Top 50</option>
            <option value="100">Top 100</option>
          </select>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={users.length === 0}
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-background/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-card-bg border border-border rounded-xl overflow-hidden">
        {users.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            No user cost data in the selected window.
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-background/50">
                  <tr className="text-left text-xs font-medium text-muted-foreground">
                    <th className="py-3 px-6">Rank</th>
                    <th className="py-3 px-6">User</th>
                    <th className="py-3 px-6 text-right">Operations</th>
                    <th className="py-3 px-6 text-right">Total Cost</th>
                    <th className="py-3 px-6 text-right">Wasted</th>
                    <th className="py-3 px-6 text-right">Last Active</th>
                    <th className="py-3 px-6" aria-label="Drill-down"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, idx) => (
                    <tr
                      key={user.userId}
                      className="border-t border-border hover:bg-background/30 transition-colors"
                    >
                      <td className="py-4 px-6">
                        {idx < 3 ? (
                          <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-accent">{idx + 1}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">{idx + 1}</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                            <span className="text-sm font-medium text-accent">
                              {getInitials(user.userName)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{user.userName}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right text-sm text-muted-foreground">
                        {formatCount(user.operations)}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="text-sm font-semibold text-foreground">
                          {formatCost(user.totalCost)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {user.wastedCost > 0 ? (
                          <span className="text-sm font-medium text-red-500">
                            {formatCost(user.wastedCost)}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right text-sm text-muted-foreground">
                        {user.lastActive
                          ? formatDistanceToNow(new Date(user.lastActive), { addSuffix: true })
                          : '—'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Link
                          href={`/admin/dashboard/users?userId=${user.userId}`}
                          className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
                          aria-label={`Open ${user.userName} in user management`}
                        >
                          Inspect
                          <ChevronRight className="w-4 h-4" aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-border">
              {users.map((user, idx) => (
                <Link
                  key={user.userId}
                  href={`/admin/dashboard/users?userId=${user.userId}`}
                  className="flex items-center justify-between p-4 hover:bg-background/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-semibold text-muted-foreground w-5">{idx + 1}</span>
                    <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-medium text-accent">{getInitials(user.userName)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{user.userName}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCount(user.operations)} ops · {formatCost(user.totalCost)}
                        {user.wastedCost > 0 && <span className="text-red-500"> · {formatCost(user.wastedCost)} wasted</span>}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function csvEscape(value: string): string {
  if (value == null) return '';
  const needsQuote = /[",\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}
