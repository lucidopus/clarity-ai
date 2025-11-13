'use client';

import { useEffect, useState } from 'react';
import { Search, Trash2, ChevronLeft, ChevronRight, X, Filter, Calendar, ArrowUpDown } from 'lucide-react';
import Button from '@/components/Button';
import Dialog from '@/components/Dialog';

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
  const [sortBy, setSortBy] = useState<'videos' | 'joined' | 'name'>('joined');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [joinDateAfter, setJoinDateAfter] = useState('');
  const [joinDateBefore, setJoinDateBefore] = useState('');
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [deleteUserDialog, setDeleteUserDialog] = useState<{ show: boolean; userId: string | null }>({ show: false, userId: null });
  const [deleteItemDialog, setDeleteItemDialog] = useState<{ show: boolean; userId: string; itemType: string; itemId: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: searchQuery,
        page: page.toString(),
        limit: '20',
        sortBy,
        sortOrder,
        ...(joinDateAfter && { joinDateAfter }),
        ...(joinDateBefore && { joinDateBefore }),
      });

      const response = await fetch(`/api/admin/users?${params}`);
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
  }, [page, searchQuery, sortBy, sortOrder, joinDateAfter, joinDateBefore]);

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

  const handleDeleteUser = async () => {
    if (!deleteUserDialog.userId) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${deleteUserDialog.userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDeleteUserDialog({ show: false, userId: null });
        setSelectedUser(null);
        fetchUsers(); // Refresh the list
      } else {
        const data = await response.json();
        console.error('Failed to delete user:', data.message);
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteItemDialog) return;

    setDeleteLoading(true);
    try {
      const { userId, itemType, itemId } = deleteItemDialog;
      const response = await fetch(`/api/admin/users/${userId}/items/${itemType}/${itemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh user details
        fetchUserDetails(userId);
        setDeleteItemDialog(null);
      } else {
        const data = await response.json();
        console.error(`Failed to delete ${itemType}:`, data.message);
      }
    } catch (error) {
      console.error(`Failed to delete item:`, error);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">

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

      {/* Filters */}
      <div className="bg-card-bg rounded-xl border border-border p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Sort By */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as 'videos' | 'joined' | 'name');
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="joined">Join Date</option>
              <option value="videos">Most Videos</option>
              <option value="name">Name</option>
            </select>
          </div>

          {/* Sort Order */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground mb-2">
              <ArrowUpDown className="w-4 h-4 inline mr-1" />
              Order
            </label>
            <select
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value as 'asc' | 'desc');
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {sortBy === 'name' ? (
                <>
                  <option value="asc">A-Z</option>
                  <option value="desc">Z-A</option>
                </>
              ) : (
                <>
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </>
              )}
            </select>
          </div>

          {/* Join Date After */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Joined After
            </label>
            <input
              type="date"
              value={joinDateAfter}
              onChange={(e) => {
                setJoinDateAfter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Join Date Before */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Joined Before
            </label>
            <input
              type="date"
              value={joinDateBefore}
              onChange={(e) => {
                setJoinDateBefore(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <Button
              onClick={() => {
                setSortBy('joined');
                setSortOrder('desc');
                setJoinDateAfter('');
                setJoinDateBefore('');
                setSearchQuery('');
                setPage(1);
              }}
              variant="secondary"
              size="sm"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card-bg rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase">Joined</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase">Activity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-foreground uppercase">Actions</th>
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
                  <tr key={user.id} className="hover:bg-background transition-colors">
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
                        <Button
                          onClick={() => fetchUserDetails(user.id)}
                          variant="primary"
                          size="sm"
                        >
                          View Details
                        </Button>
                        <button
                          onClick={() => setDeleteUserDialog({ show: true, userId: user.id })}
                          className="p-1.5 text-muted-foreground hover:bg-background rounded-lg transition-colors cursor-pointer"
                          aria-label="Delete user"
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
                className="p-2 border border-border rounded-lg hover:bg-background hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-foreground" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 border border-border rounded-lg hover:bg-background hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                className="p-2 hover:bg-background rounded-lg transition-colors cursor-pointer"
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
                    <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
                      <p className="text-sm text-muted-foreground">Videos</p>
                      <p className="text-2xl font-bold text-foreground">{selectedUser.stats.totalVideos}</p>
                    </div>
                    <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
                      <p className="text-sm text-muted-foreground">Flashcards</p>
                      <p className="text-2xl font-bold text-foreground">{selectedUser.stats.totalFlashcards}</p>
                    </div>
                    <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
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
                      <div key={video.id} className="flex items-center justify-between p-3 bg-card-bg border border-border rounded-lg hover:border-accent/50 transition-colors">
                        <div className="flex-1 cursor-pointer">
                          <p className="text-sm font-medium text-foreground">{video.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {video.stats.flashcards} cards • {video.stats.quizzes} quizzes •{' '}
                            {new Date(video.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => setDeleteItemDialog({ show: true, userId: selectedUser.user.id, itemType: 'video', itemId: video.id })}
                          className="p-2 text-muted-foreground hover:bg-background rounded-lg transition-colors cursor-pointer"
                          aria-label="Delete video"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delete User Button */}
                <div className="pt-4 border-t border-border">
                  <button
                    onClick={() => setDeleteUserDialog({ show: true, userId: selectedUser.user.id })}
                    className="w-full px-6 py-3 bg-red-500/10 text-red-500 border border-red-500/30 rounded-lg hover:bg-red-500/20 hover:border-red-500/50 transition-colors font-medium cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete User and All Data
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete User Dialog */}
      <Dialog
        isOpen={deleteUserDialog.show}
        onClose={() => setDeleteUserDialog({ show: false, userId: null })}
        onConfirm={handleDeleteUser}
        type="confirm"
        variant="error"
        title="Delete User"
        message="Are you sure you want to delete this user? All associated data (videos, flashcards, quizzes, notes, etc.) will be permanently deleted. This action cannot be undone."
        confirmText="Delete User"
        cancelText="Cancel"
        isLoading={deleteLoading}
      />

      {/* Delete Item Dialog */}
      {deleteItemDialog && (
        <Dialog
          isOpen={true}
          onClose={() => setDeleteItemDialog(null)}
          onConfirm={handleDeleteItem}
          type="confirm"
          variant="warning"
          title={`Delete ${deleteItemDialog.itemType}`}
          message={`Are you sure you want to delete this ${deleteItemDialog.itemType}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          isLoading={deleteLoading}
        />
      )}
    </div>
  );
}
