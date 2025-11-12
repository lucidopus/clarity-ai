'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/Button';

interface UserDetailModalProps {
  userId: string;
  onClose: () => void;
  onUserDeleted: () => void;
}

interface UserDetail {
  user: {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    userType: string;
    registrationDate: string;
    lastLoginDate?: string;
    loginStreak: number;
    longestStreak: number;
  };
  stats: {
    videosProcessed: number;
    totalGenerations: {
      flashcards: number;
      quizzes: number;
      prerequisites: number;
      timestamps: number;
      mindMaps: number;
      notes: number;
      solutions: number;
      userFlashcards: number;
    };
  };
  videos: Array<{
    videoId: string;
    title: string;
    createdAt: string;
    materials: {
      flashcards: number;
      quizzes: number;
      prerequisites: number;
      timestamps: number;
      mindMaps: number;
      notes: number;
      solutions: number;
      userFlashcards: number;
    };
  }>;
}

export default function UserDetailModal({ userId, onClose, onUserDeleted }: UserDetailModalProps) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchUserDetail();
  }, [userId]);

  const fetchUserDetail = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      const data = await response.json();
      if (data.success) {
        setUser(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch user detail:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        onUserDeleted();
        onClose();
      } else {
        alert('Failed to delete user: ' + data.message);
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card-bg border border-border rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-card-bg border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">User Details</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading user details...</p>
            </div>
          ) : user ? (
            <div className="space-y-6">
              {/* User Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Name</h3>
                  <p className="text-foreground">
                    {user.user.firstName} {user.user.lastName}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Username</h3>
                  <p className="text-foreground">@{user.user.username}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Email</h3>
                  <p className="text-foreground">{user.user.email}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">User Type</h3>
                  <p className="text-foreground">{user.user.userType}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Registration Date</h3>
                  <p className="text-foreground">{formatDate(user.user.registrationDate)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Login</h3>
                  <p className="text-foreground">{formatDate(user.user.lastLoginDate)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Current Streak</h3>
                  <p className="text-foreground">{user.user.loginStreak} days</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Longest Streak</h3>
                  <p className="text-foreground">{user.user.longestStreak} days</p>
                </div>
              </div>

              {/* Stats */}
              <div>
                <h3 className="text-lg font-bold text-foreground mb-3">Generation Stats</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-background rounded-lg p-4 border border-border">
                    <div className="text-2xl font-bold text-accent">
                      {user.stats.totalGenerations.flashcards}
                    </div>
                    <div className="text-sm text-muted-foreground">Flashcards</div>
                  </div>
                  <div className="bg-background rounded-lg p-4 border border-border">
                    <div className="text-2xl font-bold text-accent">{user.stats.totalGenerations.quizzes}</div>
                    <div className="text-sm text-muted-foreground">Quizzes</div>
                  </div>
                  <div className="bg-background rounded-lg p-4 border border-border">
                    <div className="text-2xl font-bold text-accent">{user.stats.totalGenerations.mindMaps}</div>
                    <div className="text-sm text-muted-foreground">Mind Maps</div>
                  </div>
                  <div className="bg-background rounded-lg p-4 border border-border">
                    <div className="text-2xl font-bold text-accent">{user.stats.videosProcessed}</div>
                    <div className="text-sm text-muted-foreground">Videos</div>
                  </div>
                </div>
              </div>

              {/* Videos */}
              <div>
                <h3 className="text-lg font-bold text-foreground mb-3">
                  Processed Videos ({user.videos.length})
                </h3>
                {user.videos.length === 0 ? (
                  <p className="text-muted-foreground">No videos processed yet</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {user.videos.map((video) => (
                      <div
                        key={video.videoId}
                        className="bg-background rounded-lg p-4 border border-border"
                      >
                        <div className="font-medium text-foreground mb-1">{video.title}</div>
                        <div className="text-sm text-muted-foreground mb-2">
                          {formatDate(video.createdAt)}
                        </div>
                        <div className="text-sm text-foreground">
                          {video.materials.flashcards} FC • {video.materials.quizzes} Q •{' '}
                          {video.materials.mindMaps} MM • {video.materials.notes} N
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Delete Section */}
              <div className="border-t border-border pt-6">
                <h3 className="text-lg font-bold text-red-500 mb-2">Danger Zone</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Deleting this user will permanently remove all their data, including videos, materials,
                  and activity logs. This action cannot be undone.
                </p>
                {!showDeleteConfirm ? (
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="!border-red-500 !text-red-500 hover:!bg-red-500/10"
                  >
                    Delete User
                  </Button>
                ) : (
                  <div className="flex gap-3">
                    <Button
                      variant="primary"
                      onClick={handleDeleteUser}
                      disabled={isDeleting}
                      className="!bg-red-500 hover:!bg-red-600"
                    >
                      {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                    </Button>
                    <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">Failed to load user details</div>
          )}
        </div>
      </div>
    </div>
  );
}
