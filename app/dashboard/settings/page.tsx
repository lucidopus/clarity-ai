'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import DashboardHeader from '@/components/DashboardHeader';
import Button from '@/components/Button';
import ThemeToggle from '@/components/ThemeToggle';
import GenerateModal from '@/components/GenerateModal';
import PasswordVerificationModal from '@/components/PasswordVerificationModal';
import DeleteAccountConfirmModal from '@/components/DeleteAccountConfirmModal';
import { ToastContainer, type ToastType } from '@/components/Toast';
import { Edit2, Save, X } from 'lucide-react';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Delete account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
  });
  const [originalFormData, setOriginalFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
  });

  // Password verification state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [pendingPassword, setPendingPassword] = useState<string>('');

  // Form state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast state
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type?: ToastType }>>([]);

  // General preferences state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [studyReminders, setStudyReminders] = useState(true);
  const [autoplayVideos, setAutoplayVideos] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  // Initialize form data when user loads
  useEffect(() => {
    if (user) {
      const initialData = {
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
      };
      setFormData(initialData);
      setOriginalFormData(initialData);
    }
  }, [user]);

  // Load general preferences from API
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await fetch('/api/preferences/general');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.preferences) {
            setEmailNotifications(data.preferences.emailNotifications ?? true);
            setStudyReminders(data.preferences.studyReminders ?? true);
            setAutoplayVideos(data.preferences.autoplayVideos ?? false);
          }
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
      }
    };

    if (user) {
      loadPreferences();
    }
  }, [user]);

  // Toast helpers
  const addToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

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

  const handleEditClick = () => {
    setIsEditMode(true);
    setErrors({});
  };

  const handleCancelClick = () => {
    setIsEditMode(false);
    setFormData(originalFormData);
    setErrors({});
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.length > 50) {
      newErrors.firstName = 'First name must be less than 50 characters';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.length > 50) {
      newErrors.lastName = 'Last name must be less than 50 characters';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (formData.username.length > 20) {
      newErrors.username = 'Username must be less than 20 characters';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, underscores, and hyphens';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveClick = async () => {
    // Validate form
    if (!validateForm()) {
      return;
    }

    // Check if email is being changed - if so, show password modal
    const isEmailChanging = formData.email?.toLowerCase() !== originalFormData.email?.toLowerCase();
    if (isEmailChanging) {
      setShowPasswordModal(true);
      return;
    }

    // If email not changing, submit directly
    await submitProfileUpdate();
  };

  const handlePasswordVerify = async (password: string) => {
    setPendingPassword(password);
    setPasswordError(null);
    setIsVerifyingPassword(true);

    try {
      await submitProfileUpdate(password);
      setShowPasswordModal(false);
    } catch (error) {
      // Error is handled in submitProfileUpdate
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const submitProfileUpdate = async (password?: string) => {
    setIsSubmitting(true);

    try {
      const payload: Record<string, string> = {};

      // Only send changed fields
      if (formData.firstName !== originalFormData.firstName) {
        payload.firstName = formData.firstName;
      }
      if (formData.lastName !== originalFormData.lastName) {
        payload.lastName = formData.lastName;
      }
      if (formData.username !== originalFormData.username) {
        payload.username = formData.username;
      }
      if (formData.email !== originalFormData.email) {
        payload.email = formData.email;
        payload.password = password || '';
      }

      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          // Field-specific validation errors
          setErrors(data.errors);
          addToast('Please fix the validation errors', 'error');
          throw new Error('Validation failed');
        } else if (data.field) {
          // Single field error (e.g., username taken)
          setErrors({ [data.field]: data.message });
          addToast(data.message, 'error');
          throw new Error(data.message);
        } else if (response.status === 401 && password) {
          // Password verification failed
          setPasswordError(data.message);
          throw new Error(data.message);
        } else {
          addToast(data.message || 'Failed to update profile', 'error');
          throw new Error(data.message || 'Failed to update profile');
        }
      }

      // Success! Update local state
      const updatedData = {
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        username: data.user.username,
        email: data.user.email,
      };
      setFormData(updatedData);
      setOriginalFormData(updatedData);
      setIsEditMode(false);
      setPasswordError(null);
      addToast('Profile updated successfully!', 'success');

      // Reload user data by calling /api/auth/me
      const userResponse = await fetch('/api/auth/me');
      const userData = await userResponse.json();
      // The auth context will automatically update via its checkAuth method
      window.location.reload(); // Simple reload to refresh all user data

    } catch (error) {
      console.error('Profile update error:', error);
      // Error messages already set above
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);

    try {
      const response = await fetch('/api/account', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        addToast(data.message || 'Failed to delete account', 'error');
        setShowDeleteModal(false);
        return;
      }

      // Success - redirect to home page
      addToast('Account deleted successfully', 'success');
      setShowDeleteModal(false);
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (error) {
      console.error('Delete account error:', error);
      addToast('An error occurred while deleting your account', 'error');
      setShowDeleteModal(false);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handlePreferenceChange = async (field: 'emailNotifications' | 'studyReminders' | 'autoplayVideos', value: boolean) => {
    // Optimistically update UI
    switch (field) {
      case 'emailNotifications':
        setEmailNotifications(value);
        break;
      case 'studyReminders':
        setStudyReminders(value);
        break;
      case 'autoplayVideos':
        setAutoplayVideos(value);
        break;
    }

    setIsSavingPreferences(true);

    try {
      const response = await fetch('/api/preferences/general', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailNotifications: field === 'emailNotifications' ? value : emailNotifications,
          studyReminders: field === 'studyReminders' ? value : studyReminders,
          autoplayVideos: field === 'autoplayVideos' ? value : autoplayVideos,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Revert on error
        switch (field) {
          case 'emailNotifications':
            setEmailNotifications(!value);
            break;
          case 'studyReminders':
            setStudyReminders(!value);
            break;
          case 'autoplayVideos':
            setAutoplayVideos(!value);
            break;
        }
        addToast(data.message || 'Failed to save preference', 'error');
        return;
      }

      addToast('Preference saved', 'success');
    } catch (error) {
      console.error('Save preference error:', error);
      // Revert on error
      switch (field) {
        case 'emailNotifications':
          setEmailNotifications(!value);
          break;
        case 'studyReminders':
          setStudyReminders(!value);
          break;
        case 'autoplayVideos':
          setAutoplayVideos(!value);
          break;
      }
      addToast('Failed to save preference', 'error');
    } finally {
      setIsSavingPreferences(false);
    }
  };

  if (!user) return null;

  return (
    <div>
      {/* Page Header */}
      <DashboardHeader
        title="Settings"
        subtitle="Manage your account preferences and settings"
        onGenerateClick={() => setShowGenerateModal(!showGenerateModal)}
        isGenerateModalOpen={showGenerateModal}
      />

      {/* Account Information Section */}
      <div className="bg-card-bg rounded-2xl p-6 border border-border mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Account Information</h2>
          {!isEditMode && (
            <Button
              onClick={handleEditClick}
              variant="ghost"
              className="flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                First Name
              </label>
              {isEditMode ? (
                <div>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className={`w-full px-4 py-3 bg-background border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-card-bg focus:ring-accent transition-colors ${
                      errors.firstName ? 'border-red-500/50' : 'border-border'
                    }`}
                    placeholder="Enter first name"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>
                  )}
                </div>
              ) : (
                <div className="px-4 py-3 bg-background border border-border rounded-xl text-foreground">
                  {formData.firstName}
                </div>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Last Name
              </label>
              {isEditMode ? (
                <div>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className={`w-full px-4 py-3 bg-background border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-card-bg focus:ring-accent transition-colors ${
                      errors.lastName ? 'border-red-500/50' : 'border-border'
                    }`}
                    placeholder="Enter last name"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>
                  )}
                </div>
              ) : (
                <div className="px-4 py-3 bg-background border border-border rounded-xl text-foreground">
                  {formData.lastName}
                </div>
              )}
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Username
            </label>
            {isEditMode ? (
              <div>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className={`w-full px-4 py-3 bg-background border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-card-bg focus:ring-accent transition-colors ${
                    errors.username ? 'border-red-500/50' : 'border-border'
                  }`}
                  placeholder="Enter username"
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-red-500">{errors.username}</p>
                )}
              </div>
            ) : (
              <div className="px-4 py-3 bg-background border border-border rounded-xl text-foreground">
                {formData.username}
              </div>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Email
            </label>
            {isEditMode ? (
              <div>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-4 py-3 bg-background border rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-card-bg focus:ring-accent transition-colors ${
                    errors.email ? 'border-red-500/50' : 'border-border'
                  }`}
                  placeholder="Enter email"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                )}
                {formData.email && originalFormData.email && formData.email.toLowerCase() !== originalFormData.email.toLowerCase() && (
                  <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                    Changing your email will require password verification
                  </p>
                )}
              </div>
            ) : (
              <div className="px-4 py-3 bg-background border border-border rounded-xl text-foreground">
                {formData.email}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {isEditMode && (
          <div className="mt-6 flex items-center justify-end gap-3">
            <Button
              onClick={handleCancelClick}
              variant="ghost"
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button
              onClick={handleSaveClick}
              variant="primary"
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
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
              <input
                type="checkbox"
                className="sr-only peer"
                checked={emailNotifications}
                onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                disabled={isSavingPreferences}
              />
              <div className="w-11 h-6 bg-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
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
              <input
                type="checkbox"
                className="sr-only peer"
                checked={studyReminders}
                onChange={(e) => handlePreferenceChange('studyReminders', e.target.checked)}
                disabled={isSavingPreferences}
              />
              <div className="w-11 h-6 bg-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
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
              <input
                type="checkbox"
                className="sr-only peer"
                checked={autoplayVideos}
                onChange={(e) => handlePreferenceChange('autoplayVideos', e.target.checked)}
                disabled={isSavingPreferences}
              />
              <div className="w-11 h-6 bg-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
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
            <Button onClick={() => setShowDeleteModal(true)} variant="ghost" className="text-red-500 hover:bg-red-500/10 border border-red-500/20">
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

      {/* Password Verification Modal */}
      <PasswordVerificationModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPasswordError(null);
        }}
        onVerify={handlePasswordVerify}
        isLoading={isVerifyingPassword}
        error={passwordError}
      />

      {/* Delete Account Confirmation Modal */}
      <DeleteAccountConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        isLoading={isDeletingAccount}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
