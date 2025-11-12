'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/Card';

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  registrationDate: string;
  lastLoginDate?: string;
  loginStreak: number;
  longestStreak: number;
  videosProcessed: number;
  generations: {
    flashcards: number;
    quizzes: number;
    prerequisites: number;
    timestamps: number;
  };
}

interface UserTableProps {
  onUserClick: (userId: string) => void;
  refreshTrigger: number;
}

export default function UserTable({ onUserClick, refreshTrigger }: UserTableProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  useEffect(() => {
    fetchUsers();
  }, [search, page, refreshTrigger]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`
      );
      const data = await response.json();
      if (data.success) {
        setUsers(data.data.users);
        setTotalPages(data.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatGenerations = (gen: User['generations']) => {
    const parts = [];
    if (gen.flashcards > 0) parts.push(`${gen.flashcards} FC`);
    if (gen.quizzes > 0) parts.push(`${gen.quizzes} Q`);
    if (gen.prerequisites > 0) parts.push(`${gen.prerequisites} P`);
    if (gen.timestamps > 0) parts.push(`${gen.timestamps} T`);
    return parts.join(' • ') || 'None';
  };

  return (
    <Card className="!cursor-default">
      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name, email, or username..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1); // Reset to first page on search
          }}
          className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">User</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Email</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Registered</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Last Login</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Streak</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Videos</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Generations</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-muted-foreground">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => onUserClick(user.id)}
                  className="border-b border-border hover:bg-accent/5 cursor-pointer transition-colors duration-200"
                >
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="text-foreground font-medium">
                        {user.firstName} {user.lastName}
                      </span>
                      <span className="text-sm text-muted-foreground">@{user.username}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-foreground">{user.email}</td>
                  <td className="py-3 px-4 text-foreground">{formatDate(user.registrationDate)}</td>
                  <td className="py-3 px-4 text-foreground">{formatDate(user.lastLoginDate)}</td>
                  <td className="py-3 px-4">
                    <span className="text-foreground">
                      {user.loginStreak}
                      {user.longestStreak > 0 && (
                        <span className="text-muted-foreground text-sm ml-1">
                          (max: {user.longestStreak})
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-foreground">{user.videosProcessed}</td>
                  <td className="py-3 px-4 text-foreground text-sm">{formatGenerations(user.generations)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm text-foreground hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            ← Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm text-foreground hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            Next →
          </button>
        </div>
      )}
    </Card>
  );
}
