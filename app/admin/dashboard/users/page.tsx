'use client';

import { useEffect, useState } from 'react';
import { Search, Trash2, ChevronLeft, ChevronRight, X, AlertTriangle } from 'lucide-react';
import Button from '@/components/Button';

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  lastLoginDate: string | null;
  loginStreak: number;
  stats: {
    videos: number;
    flashcards: number;
    quizzes: number;
    activities: number;
  };
}

interface UserDetailsResponse {
  user: {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    userType: string;
    customUserType?: string;
    preferences?: unknown;
    createdAt: string;
    updatedAt: string;
    lastLoginDate: string | null;
    loginStreak: number;
    longestStreak: number;
  };
  videos: Array<{
    id: string;
    videoId: string;
    title: string;
    thumbnail?: string;
    createdAt: string;
    processingStatus: string;
    stats: {
      flashcards: number;
      quizzes: number;
      hasLearningMaterial: boolean;
      hasMindMap: boolean;
      hasNotes: boolean;
    };
  }>;
  stats: {
    totalVideos: number;
    totalFlashcards: number;
    totalQuizzes: number;
    totalNotes: number;
    totalMindMaps: number;
    totalSolutions: number;
    totalActivities: number;
    activityBreakdown: Record<string, number>;
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserDetailsResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/users?search=${encodeURIComponent(searchQuery)}&page=${page}&limit=20`
      );
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchQuery]);

  const fetchUserDetails = async (userId: string) => {
    setDetailsLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedUser(data as UserDetailsResponse);
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setShowDeleteConfirm(null);
        setSelectedUser(null);
        fetchUsers(); // Refresh the list
      } else {
        const data = await response.json();
        alert(`Failed to delete user: ${data.message}`);
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteItem = async (userId: string, itemType: string, itemId: string) => {
    if (!confirm(`Are you sure you want to delete this ${itemType}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/items/${itemType}/${itemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh user details
        fetchUserDetails(userId);
      } else {
        const data = await response.json();
        alert(`Failed to delete ${itemType}: ${data.message}`);
      }
    } catch (error) {
      console.error(`Failed to delete ${itemType}:`, error);
      alert(`Failed to delete ${itemType}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-1">View and manage user accounts</p>
      </div>

      {/* Search Bar */}
      <div className="bg-card-bg rounded-xl border border-border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, username, or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1); // Reset to first page on search
            }}
            className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Activity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    Loading...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-foreground">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">@{user.username}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-3 text-sm">
                        <span className="text-muted-foreground">
                          {user.stats.videos} <span className="text-xs">videos</span>
                        </span>
                        <span className="text-muted-foreground">
                          {user.stats.flashcards} <span className="text-xs">cards</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => fetchUserDetails(user.id)}
                          className="px-3 py-1.5 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors cursor-pointer"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(user.id)}
                          className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border border-border rounded-lg hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-foreground" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 border border-border rounded-lg hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-foreground" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card-bg rounded-xl border border-border max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card-bg border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {selectedUser.user.firstName} {selectedUser.user.lastName}
                </h2>
                <p className="text-sm text-muted-foreground">@{selectedUser.user.username}</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {detailsLoading ? (
              <div className="p-6 text-center text-muted-foreground">Loading details...</div>
            ) : (
              <div className="p-6 space-y-6">
                {/* User Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Email</label>
                    <p className="text-foreground">{selectedUser.user.email}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">User Type</label>
                    <p className="text-foreground">{selectedUser.user.userType}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Joined</label>
                    <p className="text-foreground">{new Date(selectedUser.user.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Last Login</label>
                    <p className="text-foreground">
                      {selectedUser.user.lastLoginDate
                        ? new Date(selectedUser.user.lastLoginDate).toLocaleString()
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Current Streak</label>
                    <p className="text-foreground">{selectedUser.user.loginStreak} days</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Longest Streak</label>
                    <p className="text-foreground">{selectedUser.user.longestStreak} days</p>
                  </div>
                </div>

                {/* Stats */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Statistics</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-secondary/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Videos</p>
                      <p className="text-2xl font-bold text-foreground">{selectedUser.stats.totalVideos}</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Flashcards</p>
                      <p className="text-2xl font-bold text-foreground">{selectedUser.stats.totalFlashcards}</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">Quizzes</p>
                      <p className="text-2xl font-bold text-foreground">{selectedUser.stats.totalQuizzes}</p>
                    </div>
                  </div>
                </div>

                {/* Videos */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-3">Videos ({selectedUser.videos.length})</h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {selectedUser.videos.map((video) => (
                      <div key={video.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                        <div className="flex-1 cursor-pointer">
                          <p className="text-sm font-medium text-foreground">{video.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {video.stats.flashcards} cards • {video.stats.quizzes} quizzes •{' '}
                            {new Date(video.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteItem(selectedUser.user.id, 'video', video.id)}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delete User Button */}
                <div className="pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(selectedUser.user.id)}
                    className="w-full text-red-500 border-red-500 hover:bg-red-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete User and All Data
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card-bg rounded-xl border border-border max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-500/10 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Confirm Deletion</h3>
                <p className="text-sm text-muted-foreground">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-foreground mb-6">
              Are you sure you want to delete this user? All associated data (videos, flashcards, quizzes, notes, etc.)
              will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)} className="flex-1 cursor-pointer">
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleDeleteUser(showDeleteConfirm)}
                disabled={deleteLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 cursor-pointer"
              >
                {deleteLoading ? 'Deleting...' : 'Delete User'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
