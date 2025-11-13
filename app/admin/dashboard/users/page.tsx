'use client';

import { useEffect, useState } from 'react';
import { Search, Trash2, ChevronLeft, ChevronRight, X, Filter, Calendar, ArrowUpDown, ChevronDown, Video, CreditCard, FileQuestion, Activity, TrendingUp, Flame } from 'lucide-react';
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
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'videos' | 'activity'>('overview');

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
      {/* Search Bar and Filter Toggle */}
      <div className="bg-card-bg rounded-xl border border-border p-4">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, username, or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant={showFilters ? 'primary' : 'secondary'}
            size="md"
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Collapsible Filters */}
      {showFilters && (
        <div className="bg-card-bg rounded-xl border border-border p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Sort By */}
            <div>
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
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
              >
                <option value="joined">Join Date</option>
                <option value="videos">Most Videos</option>
                <option value="name">Name</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
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
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
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
            <div>
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
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
              />
            </div>

            {/* Join Date Before */}
            <div>
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
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
              />
            </div>
          </div>

          {/* Clear Filters */}
          <div className="flex justify-end">
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
              Clear All Filters
            </Button>
          </div>
        </div>
      )}

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
          <div className="bg-card-bg rounded-xl border border-border max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-card-bg border-b border-border px-6 py-5 flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-accent text-2xl font-bold">
                  {selectedUser.user.firstName.charAt(0)}{selectedUser.user.lastName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {selectedUser.user.firstName} {selectedUser.user.lastName}
                  </h2>
                  <p className="text-sm text-muted-foreground">@{selectedUser.user.username}</p>
                  <p className="text-sm text-muted-foreground mt-1">{selectedUser.user.email}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
                      {selectedUser.user.userType}
                    </span>
                    {selectedUser.user.loginStreak > 0 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20 flex items-center gap-1">
                        <Flame className="w-3 h-3" />
                        {selectedUser.user.loginStreak} day streak
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setActiveTab('overview');
                }}
                className="p-2 hover:bg-background rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-border px-6 flex gap-1 bg-background/50">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
                  activeTab === 'overview'
                    ? 'text-accent border-accent'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('videos')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
                  activeTab === 'videos'
                    ? 'text-accent border-accent'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                Videos ({selectedUser.videos.length})
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
                  activeTab === 'activity'
                    ? 'text-accent border-accent'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                Activity
              </button>
            </div>

            {detailsLoading ? (
              <div className="p-8 text-center text-muted-foreground flex-1 flex items-center justify-center">
                <div>Loading details...</div>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 rounded-xl p-4 border border-cyan-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Video className="w-5 h-5 text-cyan-500" />
                          <p className="text-sm text-muted-foreground">Videos</p>
                        </div>
                        <p className="text-3xl font-bold text-foreground">{selectedUser.stats.totalVideos}</p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl p-4 border border-purple-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <CreditCard className="w-5 h-5 text-purple-500" />
                          <p className="text-sm text-muted-foreground">Flashcards</p>
                        </div>
                        <p className="text-3xl font-bold text-foreground">{selectedUser.stats.totalFlashcards}</p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl p-4 border border-blue-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <FileQuestion className="w-5 h-5 text-blue-500" />
                          <p className="text-sm text-muted-foreground">Quizzes</p>
                        </div>
                        <p className="text-3xl font-bold text-foreground">{selectedUser.stats.totalQuizzes}</p>
                      </div>
                      <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-xl p-4 border border-emerald-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="w-5 h-5 text-emerald-500" />
                          <p className="text-sm text-muted-foreground">Activities</p>
                        </div>
                        <p className="text-3xl font-bold text-foreground">{selectedUser.stats.totalActivities}</p>
                      </div>
                    </div>

                    {/* User Details */}
                    <div className="bg-background rounded-xl border border-border p-5">
                      <h3 className="text-lg font-semibold text-foreground mb-4">Account Details</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Joined Date</label>
                          <p className="text-foreground mt-1">{new Date(selectedUser.user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Last Login</label>
                          <p className="text-foreground mt-1">
                            {selectedUser.user.lastLoginDate
                              ? new Date(selectedUser.user.lastLoginDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                              : 'Never'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Current Streak</label>
                          <p className="text-foreground mt-1 flex items-center gap-2">
                            {selectedUser.user.loginStreak > 0 && <Flame className="w-4 h-4 text-orange-500" />}
                            {selectedUser.user.loginStreak} days
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Longest Streak</label>
                          <p className="text-foreground mt-1 flex items-center gap-2">
                            {selectedUser.user.longestStreak > 0 && <TrendingUp className="w-4 h-4 text-accent" />}
                            {selectedUser.user.longestStreak} days
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Activity Breakdown */}
                    {Object.keys(selectedUser.stats.activityBreakdown).length > 0 && (
                      <div className="bg-background rounded-xl border border-border p-5">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Activity Breakdown</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {Object.entries(selectedUser.stats.activityBreakdown).map(([type, count]) => (
                            <div key={type} className="flex items-center justify-between p-3 bg-card-bg rounded-lg border border-border">
                              <span className="text-sm text-muted-foreground capitalize">{type.replace(/_/g, ' ')}</span>
                              <span className="text-sm font-semibold text-foreground">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Delete User Section */}
                    <div className="bg-red-500/5 rounded-xl border border-red-500/20 p-5">
                      <h3 className="text-lg font-semibold text-red-500 mb-2">Danger Zone</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Deleting this user will permanently remove all associated data including videos, flashcards, quizzes, and activity logs. This action cannot be undone.
                      </p>
                      <button
                        onClick={() => setDeleteUserDialog({ show: true, userId: selectedUser.user.id })}
                        className="px-6 py-2.5 bg-red-500/10 text-red-500 border border-red-500/30 rounded-lg hover:bg-red-500/20 hover:border-red-500/50 transition-colors font-medium cursor-pointer flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete User Account
                      </button>
                    </div>
                  </div>
                )}

                {/* Videos Tab */}
                {activeTab === 'videos' && (
                  <div className="space-y-4">
                    {selectedUser.videos.length === 0 ? (
                      <div className="text-center py-12">
                        <Video className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No videos processed yet</p>
                      </div>
                    ) : (
                      selectedUser.videos.map((video) => (
                        <div key={video.id} className="bg-background rounded-xl border border-border p-4 hover:border-accent/50 transition-colors">
                          <div className="flex gap-4">
                            {video.thumbnail && (
                              <img
                                src={video.thumbnail}
                                alt={video.title}
                                className="w-32 h-20 rounded-lg object-cover"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-foreground mb-1 truncate">{video.title}</h4>
                              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-2">
                                <span className="flex items-center gap-1">
                                  <CreditCard className="w-3 h-3" />
                                  {video.stats.flashcards} flashcards
                                </span>
                                <span className="flex items-center gap-1">
                                  <FileQuestion className="w-3 h-3" />
                                  {video.stats.quizzes} quizzes
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(video.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                {video.stats.hasLearningMaterial && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">Material</span>
                                )}
                                {video.stats.hasMindMap && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-500 border border-purple-500/20">Mind Map</span>
                                )}
                                {video.stats.hasNotes && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">Notes</span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => setDeleteItemDialog({ show: true, userId: selectedUser.user.id, itemType: 'video', itemId: video.id })}
                              className="p-2 h-fit text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                              aria-label="Delete video"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Activity Tab */}
                {activeTab === 'activity' && (
                  <div className="space-y-4">
                    <div className="bg-background rounded-xl border border-border p-5">
                      <h3 className="text-lg font-semibold text-foreground mb-4">Total Activities</h3>
                      <p className="text-4xl font-bold text-accent">{selectedUser.stats.totalActivities}</p>
                    </div>

                    {Object.keys(selectedUser.stats.activityBreakdown).length > 0 && (
                      <div className="bg-background rounded-xl border border-border p-5">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Activity Types</h3>
                        <div className="space-y-3">
                          {Object.entries(selectedUser.stats.activityBreakdown)
                            .sort(([, a], [, b]) => b - a)
                            .map(([type, count]) => {
                              const total = selectedUser.stats.totalActivities;
                              const percentage = total > 0 ? (count / total) * 100 : 0;
                              return (
                                <div key={type}>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-foreground capitalize">{type.replace(/_/g, ' ')}</span>
                                    <span className="text-sm text-muted-foreground">{count} ({percentage.toFixed(1)}%)</span>
                                  </div>
                                  <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-accent rounded-full transition-all"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
