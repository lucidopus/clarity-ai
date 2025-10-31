'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import DashboardHeader from '@/components/DashboardHeader';
import Button from '@/components/Button';
import ThemeToggle from '@/components/ThemeToggle';
import GenerateModal from '@/components/GenerateModal';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (url: string) => {
    setIsGenerating(true);
    try {
      // TODO: Implement actual generation logic in Phase 5
      console.log('Generating materials for URL:', url);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Close modal and show success
      setShowGenerateModal(false);
      // TODO: Redirect to generated materials or show success message
    } catch (error) {
      console.error('Generation failed:', error);
      // TODO: Show error message
    } finally {
      setIsGenerating(false);
    }
  };

  if (!user) return null;

  return (
    <div>
      {/* Page Header */}
      <DashboardHeader
        title="Settings"
        subtitle="Manage your account preferences and settings"
        onGenerateClick={() => setShowGenerateModal(true)}
      />

      {/* Account Information Section */}
      <div className="bg-card-bg rounded-2xl p-6 border border-border mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-6">Account Information</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">First Name</label>
              <div className="px-4 py-3 bg-background border border-border rounded-xl text-foreground">
                {user.firstName}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Last Name</label>
              <div className="px-4 py-3 bg-background border border-border rounded-xl text-foreground">
                {user.lastName}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Username</label>
            <div className="px-4 py-3 bg-background border border-border rounded-xl text-foreground">
              {user.username}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Email</label>
            <div className="px-4 py-3 bg-background border border-border rounded-xl text-foreground">
              {user.email}
            </div>
          </div>
        </div>
        <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <p className="text-sm text-foreground">
            <span className="font-medium">ℹ️ Note:</span> Account information is currently view-only. Contact support to make changes.
          </p>
        </div>
      </div>

      {/* Appearance Section */}
      <div className="bg-card-bg rounded-2xl p-6 border border-border mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-6">Appearance</h2>
        <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-border">
          <div>
            <p className="text-foreground font-medium mb-1">Theme</p>
            <p className="text-sm text-muted-foreground">
              Choose between light and dark mode
            </p>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Preferences Section */}
      <div className="bg-card-bg rounded-2xl p-6 border border-border mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-6">Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-border">
            <div>
              <p className="text-foreground font-medium mb-1">Email Notifications</p>
              <p className="text-sm text-muted-foreground">
                Receive updates about your learning progress
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>
          <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-border">
            <div>
              <p className="text-foreground font-medium mb-1">Study Reminders</p>
              <p className="text-sm text-muted-foreground">
                Get notified to maintain your study streak
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>
          <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-border">
            <div>
              <p className="text-foreground font-medium mb-1">Auto-play Videos</p>
              <p className="text-sm text-muted-foreground">
                Automatically play videos in transcript viewer
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/10 rounded-2xl p-6 border border-red-500/20">
        <h2 className="text-xl font-semibold text-red-500 mb-6">Danger Zone</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-red-500/20">
            <div>
              <p className="text-foreground font-medium mb-1">Logout</p>
              <p className="text-sm text-muted-foreground">
                Sign out of your account
              </p>
            </div>
            <Button onClick={logout} variant="ghost" className="text-red-500 hover:bg-red-500/10 border border-red-500/20">
              Logout
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-red-500/20">
            <div>
              <p className="text-foreground font-medium mb-1">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all data
              </p>
            </div>
            <Button variant="ghost" className="text-red-500 hover:bg-red-500/10 border border-red-500/20">
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Generate Modal */}
      <GenerateModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGenerate}
        isLoading={isGenerating}
      />
    </div>
  );
}
