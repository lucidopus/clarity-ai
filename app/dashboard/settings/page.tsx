'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import DashboardHeader from '@/components/DashboardHeader';
import Button from '@/components/Button';
import ThemeToggle from '@/components/ThemeToggle';
import GenerateModal, { type GeneratePayload } from '@/components/GenerateModal';
import { useLiveLecture } from '@/lib/live-lecture/LiveLectureContext';
import PasswordVerificationModal from '@/components/PasswordVerificationModal';
import DeleteAccountConfirmModal from '@/components/DeleteAccountConfirmModal';
import { ToastContainer, type ToastType } from '@/components/Toast';
import { Edit2, Save, X, Info, Clock, Volume2, Wind, AlertTriangle, Timer } from 'lucide-react';
import { MAX_LEARNING_PROFILE_UPDATES_PER_MONTH } from '@/lib/config';
import { useAmbientEnabled } from '@/lib/focus-mode/use-ambient-enabled';
import { useBreathing } from '@/lib/breathing/useBreathing';

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function calcDuration(start: string, end: string): number {
  const raw = timeToMinutes(end) - timeToMinutes(start);
  return raw < 0 ? raw + 1440 : raw;
}

function resolveTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function formatHHMM12(hhmm: string): string {
  if (!hhmm) return '';
  const [hRaw, mRaw] = hhmm.split(':').map(Number);
  if (Number.isNaN(hRaw) || Number.isNaN(mRaw)) return '';
  const hr12 = hRaw === 0 ? 12 : hRaw > 12 ? hRaw - 12 : hRaw;
  const suffix = hRaw >= 12 ? 'PM' : 'AM';
  return `${hr12}:${mRaw.toString().padStart(2, '0')} ${suffix}`;
}

function formatEffectiveAt(iso: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      weekday: 'short',
      timeZone: timezone,
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

function formatResetWhen(iso: string): string {
  try {
    const ms = new Date(iso).getTime() - Date.now();
    if (!Number.isFinite(ms) || ms <= 0) return 'soon';
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    if (days >= 1) {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(new Date(iso));
    }
    const hours = Math.ceil(ms / (60 * 60 * 1000));
    return `in ${hours} hour${hours === 1 ? '' : 's'}`;
  } catch {
    return 'soon';
  }
}

const PASSWORD_ATTEMPT_KEY = 'settings-email-password-attempts';
const MAX_PASSWORD_ATTEMPTS = 4;
const PASSWORD_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

type PasswordAttemptState = {
  attempts: number;
  windowStart: number | null;
  lockedUntil: number | null;
};

const defaultPasswordAttemptState: PasswordAttemptState = {
  attempts: 0,
  windowStart: null,
  lockedUntil: null,
};

const formatLockoutDuration = (remainingMs: number) => {
  const minutes = Math.max(1, Math.ceil(remainingMs / 60000));
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
};

const normalizeStoredPasswordAttempts = (state: { attempts?: number; windowStart?: number | null }): PasswordAttemptState => {
  if (!state || !state.windowStart) {
    return defaultPasswordAttemptState;
  }

  const now = Date.now();
  const elapsed = now - state.windowStart;

  if (elapsed >= PASSWORD_ATTEMPT_WINDOW_MS) {
    return defaultPasswordAttemptState;
  }

  const attempts = Number(state.attempts) || 0;
  const lockedUntil = attempts >= MAX_PASSWORD_ATTEMPTS
    ? state.windowStart + PASSWORD_ATTEMPT_WINDOW_MS
    : null;

  return {
    attempts,
    windowStart: state.windowStart,
    lockedUntil,
  };
};

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { openSetup: openLiveLecture } = useLiveLecture();
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
  const [passwordAttempts, setPasswordAttempts] = useState<PasswordAttemptState>(defaultPasswordAttemptState);

  const persistPasswordAttemptState = useCallback((state: PasswordAttemptState) => {
    if (typeof window === 'undefined') return;
    if (!state.windowStart) {
      window.localStorage.removeItem(PASSWORD_ATTEMPT_KEY);
      return;
    }
    window.localStorage.setItem(
      PASSWORD_ATTEMPT_KEY,
      JSON.stringify({
        attempts: state.attempts,
        windowStart: state.windowStart,
      }),
    );
  }, []);

  const resetPasswordAttempts = useCallback(() => {
    setPasswordAttempts(defaultPasswordAttemptState);
    persistPasswordAttemptState(defaultPasswordAttemptState);
  }, [persistPasswordAttemptState]);

  const recordPasswordFailure = useCallback(() => {
    const now = Date.now();
    const windowStartValid = passwordAttempts.windowStart && (now - passwordAttempts.windowStart) < PASSWORD_ATTEMPT_WINDOW_MS;
    const windowStart = windowStartValid ? passwordAttempts.windowStart! : now;
    const attempts = windowStartValid ? passwordAttempts.attempts + 1 : 1;
    const lockedUntil = attempts >= MAX_PASSWORD_ATTEMPTS ? windowStart + PASSWORD_ATTEMPT_WINDOW_MS : null;

    const nextState = {
      attempts,
      windowStart,
      lockedUntil,
    };

    setPasswordAttempts(nextState);
    persistPasswordAttemptState(nextState);
    return nextState;
  }, [passwordAttempts, persistPasswordAttemptState]);

  const getLockoutMessage = useCallback((lockedUntil: number | null) => {
    if (!lockedUntil) return '';
    return `Too many attempts. Try again in ${formatLockoutDuration(Math.max(lockedUntil - Date.now(), 0))}.`;
  }, []);

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

  // Study window (cognitive contract) state
  const [contractLoaded, setContractLoaded] = useState(false);
  const [hasSavedContract, setHasSavedContract] = useState(false);
  const [windowStart, setWindowStart] = useState('');
  const [windowEnd, setWindowEnd] = useState('');
  const [savedWindowStart, setSavedWindowStart] = useState<string | null>(null);
  const [savedWindowEnd, setSavedWindowEnd] = useState<string | null>(null);
  const [savedTimezone, setSavedTimezone] = useState<string | null>(null);
  const [isSavingContract, setIsSavingContract] = useState(false);
  const [isClearingContract, setIsClearingContract] = useState(false);
  const [contractError, setContractError] = useState<string | null>(null);
  // Edit-budget + pending-edit state (issue #104)
  const [pendingContract, setPendingContract] = useState<{
    windowStart: string;
    windowEnd: string;
    timezone: string;
    effectiveAt: string;
  } | null>(null);
  const [editsRemaining, setEditsRemaining] = useState<number | null>(null);
  const [editBudgetMax, setEditBudgetMax] = useState<number | null>(null);
  const [editsResetAt, setEditsResetAt] = useState<string | null>(null);
  const [isCancellingPending, setIsCancellingPending] = useState(false);

  // Focus-mode ambient sound preference — client-side only, no server sync.
  const [ambientEnabled, setAmbientEnabled] = useAmbientEnabled();
  const [ambientInfoOpen, setAmbientInfoOpen] = useState(false);

  // Pre-session breathing warm-up preference — client-side only.
  const breathing = useBreathing(user?.id ?? null);
  const [breathingInfoOpen, setBreathingInfoOpen] = useState(false);

  // Learning profile update limit state
  const [updatesRemaining, setUpdatesRemaining] = useState<number>(MAX_LEARNING_PROFILE_UPDATES_PER_MONTH);

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

  // Load stored password attempt data (if any)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = window.localStorage.getItem(PASSWORD_ATTEMPT_KEY);
      if (!stored) return;
      const normalized = normalizeStoredPasswordAttempts(JSON.parse(stored));
      setPasswordAttempts(normalized);
      if (!normalized.windowStart) {
        persistPasswordAttemptState(normalized);
      }
    } catch (error) {
      console.error('Failed to load password attempts', error);
      window.localStorage.removeItem(PASSWORD_ATTEMPT_KEY);
    }
  }, [persistPasswordAttemptState]);

  // Automatically clear attempts once the window expires
  useEffect(() => {
    if (!passwordAttempts.windowStart) return;

    const now = Date.now();
    const elapsed = now - passwordAttempts.windowStart;
    const remaining = PASSWORD_ATTEMPT_WINDOW_MS - elapsed;

    if (remaining <= 0) {
      resetPasswordAttempts();
      return;
    }

    const timeout = window.setTimeout(() => {
      resetPasswordAttempts();
    }, remaining);

    return () => clearTimeout(timeout);
  }, [passwordAttempts.windowStart, resetPasswordAttempts]);

  // Keep error message in sync with lockout state
  useEffect(() => {
    if (showPasswordModal && passwordAttempts.lockedUntil && passwordAttempts.lockedUntil > Date.now()) {
      setPasswordError(getLockoutMessage(passwordAttempts.lockedUntil));
    }

    if (!passwordAttempts.windowStart && passwordError) {
      setPasswordError(null);
    }
  }, [getLockoutMessage, passwordAttempts.lockedUntil, passwordAttempts.windowStart, passwordError, showPasswordModal]);

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

  // Load current study window (cognitive contract) + budget + pending state
  useEffect(() => {
    const loadContract = async () => {
      try {
        const response = await fetch('/api/streak-contract');
        if (!response.ok) return;
        const data = await response.json();
        const active = data?.activeContract as
          | { windowStart: string; windowEnd: string; timezone: string }
          | null
          | undefined;
        if (active) {
          setWindowStart(active.windowStart);
          setWindowEnd(active.windowEnd);
          setSavedWindowStart(active.windowStart);
          setSavedWindowEnd(active.windowEnd);
          setSavedTimezone(active.timezone);
          setHasSavedContract(true);
        }
        if (data?.pendingContract) {
          setPendingContract({
            windowStart: data.pendingContract.windowStart,
            windowEnd: data.pendingContract.windowEnd,
            timezone: data.pendingContract.timezone,
            effectiveAt: data.pendingContract.effectiveAt,
          });
        }
        if (typeof data?.editsRemaining === 'number') setEditsRemaining(data.editsRemaining);
        if (typeof data?.editBudgetMax === 'number') setEditBudgetMax(data.editBudgetMax);
        if (data?.editsResetAt) setEditsResetAt(data.editsResetAt);
      } catch (error) {
        console.error('Failed to load study window:', error);
      } finally {
        setContractLoaded(true);
      }
    };

    if (user) {
      loadContract();
    }
  }, [user]);

  // Load learning profile updates remaining count
  useEffect(() => {
    const loadUpdatesRemaining = async () => {
      try {
        const response = await fetch('/api/preferences');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.updatesRemainingThisMonth !== undefined) {
            setUpdatesRemaining(data.updatesRemainingThisMonth);
          }
        }
      } catch (error) {
        console.error('Failed to load updates remaining:', error);
      }
    };

    if (user) {
      loadUpdatesRemaining();
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

  const handleGenerate = async (payload: GeneratePayload) => {
    setIsGenerating(true);
    try {
      // TODO: Implement actual generation logic in Phase 5
      console.log('Generating materials:', payload);

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

  const isPasswordLockedOut = Boolean(passwordAttempts.lockedUntil && passwordAttempts.lockedUntil > Date.now());

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
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
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
    if (isPasswordLockedOut) {
      setPasswordError(getLockoutMessage(passwordAttempts.lockedUntil));
      return;
    }

    setPasswordError(null);
    setIsVerifyingPassword(true);

    try {
      const success = await submitProfileUpdate(password);
      if (success) {
        setShowPasswordModal(false);
      }
    } catch {
      // Error is handled in submitProfileUpdate
      // Password errors don't throw, so this is for other errors
    } finally {
      setIsVerifyingPassword(false);
    }

    setIsVerifyingPassword(false);
  };

  const submitProfileUpdate = async (password?: string): Promise<boolean> => {
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
          return false;
        } else if (data.field) {
          // Single field error (e.g., username taken)
          setErrors({ [data.field]: data.message });
          addToast(data.message, 'error');
          return false;
        } else if (response.status === 401 && password) {
          // Password verification failed - don't throw, keep modal open
          const attemptState = recordPasswordFailure();
          if (attemptState.lockedUntil && attemptState.lockedUntil > Date.now()) {
            setPasswordError(getLockoutMessage(attemptState.lockedUntil));
          } else {
            const remainingAttempts = Math.max(MAX_PASSWORD_ATTEMPTS - attemptState.attempts, 0);
            const baseMessage =
              data?.message && !/attempt/i.test(data.message)
                ? data.message
                : 'Incorrect password';
            const attemptsText = `${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`;
            setPasswordError(`${baseMessage}. ${attemptsText}`);
          }
          return false;
        } else {
          addToast(data.message || 'Failed to update profile', 'error');
          return false;
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
      resetPasswordAttempts();
      addToast('Profile updated successfully!', 'success');

      // Reload user data by calling /api/auth/me
      const userResponse = await fetch('/api/auth/me');
      await userResponse.json();
      // The auth context will automatically update via its checkAuth method
      window.location.reload(); // Simple reload to refresh all user data

      return true; // Return true to indicate success

    } catch (error) {
      console.error('Profile update error:', error);
      // Error messages already set above
      return false; // Return false to indicate failure
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

  const handleSaveStudyWindow = async () => {
    if (!windowStart || !windowEnd) {
      setContractError('Pick a start and end time first.');
      return;
    }
    const durationMinutes = calcDuration(windowStart, windowEnd);
    if (durationMinutes < 15 || durationMinutes > 8 * 60) {
      setContractError('Pick a window between 15 minutes and 8 hours.');
      return;
    }
    const timezone = savedTimezone || resolveTimezone();
    setIsSavingContract(true);
    setContractError(null);
    try {
      const response = await fetch('/api/streak-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ windowStart, windowEnd, timezone }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setContractError(data?.message || 'Could not save your Clarity Mode hours. Try again.');
        if (typeof data?.editsRemaining === 'number') setEditsRemaining(data.editsRemaining);
        if (data?.editsResetAt) setEditsResetAt(data.editsResetAt);
        return;
      }
      // Active window may not have flipped yet — pending edits activate at
      // next local midnight. Reflect both slots + the refreshed budget.
      if (data.activeContract) {
        setSavedWindowStart(data.activeContract.windowStart);
        setSavedWindowEnd(data.activeContract.windowEnd);
        setSavedTimezone(data.activeContract.timezone);
        setWindowStart(data.activeContract.windowStart);
        setWindowEnd(data.activeContract.windowEnd);
      } else {
        setSavedWindowStart(windowStart);
        setSavedWindowEnd(windowEnd);
        setSavedTimezone(timezone);
      }
      setHasSavedContract(true);
      setPendingContract(data.pendingContract ?? null);
      if (typeof data.editsRemaining === 'number') setEditsRemaining(data.editsRemaining);
      if (typeof data.editBudgetMax === 'number') setEditBudgetMax(data.editBudgetMax);
      setEditsResetAt(data.editsResetAt ?? null);
      window.dispatchEvent(new Event('focus-mode:refresh'));
      addToast(
        data.pendingContract
          ? 'Changes saved. They take effect tomorrow.'
          : 'Clarity Mode saved',
        'success',
      );
    } catch (error) {
      console.error('Save study window error:', error);
      setContractError('Could not save your Clarity Mode hours. Try again.');
    } finally {
      setIsSavingContract(false);
    }
  };

  const handleCancelPendingChange = async () => {
    setIsCancellingPending(true);
    setContractError(null);
    try {
      const response = await fetch('/api/streak-contract/pending', { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        setContractError(data?.message || 'Could not cancel the scheduled change.');
        return;
      }
      setPendingContract(null);
      if (savedWindowStart) setWindowStart(savedWindowStart);
      if (savedWindowEnd) setWindowEnd(savedWindowEnd);
      if (typeof data.editsRemaining === 'number') setEditsRemaining(data.editsRemaining);
      if (typeof data.editBudgetMax === 'number') setEditBudgetMax(data.editBudgetMax);
      setEditsResetAt(data.editsResetAt ?? null);
      addToast('Scheduled change cancelled.', 'info');
    } catch (error) {
      console.error('Cancel pending change error:', error);
      setContractError('Could not cancel the scheduled change.');
    } finally {
      setIsCancellingPending(false);
    }
  };

  const handleClearStudyWindow = async () => {
    setIsClearingContract(true);
    setContractError(null);
    try {
      const response = await fetch('/api/streak-contract', { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setContractError(data?.message || 'Could not clear your Clarity Mode hours. Try again.');
        return;
      }
      setSavedWindowStart(null);
      setSavedWindowEnd(null);
      setSavedTimezone(null);
      setHasSavedContract(false);
      setWindowStart('');
      setWindowEnd('');
      setPendingContract(null);
      window.dispatchEvent(new Event('focus-mode:refresh'));
      addToast('Clarity Mode cleared', 'success');
    } catch (error) {
      console.error('Clear study window error:', error);
      setContractError('Could not clear your Clarity Mode hours. Try again.');
    } finally {
      setIsClearingContract(false);
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
        onLiveLectureClick={openLiveLecture}
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

      {/* Learning Profile Section */}
      <div className="bg-card-bg rounded-2xl p-6 border border-border mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Learning Profile</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 ${
                updatesRemaining > 0
                  ? 'bg-accent/10 text-accent border-accent/20'
                  : 'bg-red-500/10 text-red-500 border-red-500/20'
              }`}>
                {updatesRemaining} / {MAX_LEARNING_PROFILE_UPDATES_PER_MONTH} Updates Left
              </div>
              <div className="relative group">
                <Info className="w-4 h-4 text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                <div className="absolute right-0 top-full mt-2 w-[min(calc(100vw-2rem),18rem)] p-3 rounded-lg bg-card-bg border border-border shadow-lg text-xs text-muted-foreground opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <p className="font-medium text-foreground mb-1">Why the limit?</p>
                  <p>Clarity personalizes your flashcards, quizzes, case studies, and Clara&apos;s tutoring based on your learning profile. Changing it often would make your existing materials inconsistent, so we limit updates to {MAX_LEARNING_PROFILE_UPDATES_PER_MONTH} per month to keep things deliberate.</p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => window.location.href = '/onboarding?mode=edit'}
              variant="ghost"
              disabled={updatesRemaining === 0}
              className="flex items-center gap-2 h-9 px-3"
            >
              <Edit2 className="w-4 h-4" />
              <span className="hidden sm:inline">Edit Profile</span>
            </Button>
          </div>
        </div>
        
        {user?.preferences?.learning ? (
          <div className="space-y-6">
            {/* Role & Learning Goals */}
            {(user.preferences.learning.role || user.preferences.learning.learningGoals?.length > 0 || user.preferences.learning.learningGoalText) && (
              <div className="p-4 bg-background rounded-xl border border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">Learning Goals & Context</h3>
                
                {user.preferences.learning.role && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-1">Role</p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-accent/10 text-accent border border-accent/20">
                      {user.preferences.learning.role}
                    </span>
                  </div>
                )}
                
                {user.preferences.learning.learningGoals && user.preferences.learning.learningGoals.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-2">Learning Goals</p>
                    <div className="flex flex-wrap gap-2">
                      {user.preferences.learning.learningGoals.map((goal, index) => (
                        <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-accent/10 text-accent border border-accent/20">
                          {goal}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {user.preferences.learning.learningGoalText && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Custom Goal</p>
                    <p className="text-sm text-foreground italic">&quot;{user.preferences.learning.learningGoalText}&quot;</p>
                  </div>
                )}
              </div>
            )}

            {/* Learning Challenges */}
            {(Array.isArray(user.preferences.learning.learningChallenges) && user.preferences.learning.learningChallenges.length > 0 || user.preferences.learning.learningChallengesText) && (
              <div className="p-4 bg-background rounded-xl border border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">Learning Challenges</h3>
                
                {user.preferences.learning.learningChallenges && user.preferences.learning.learningChallenges.length > 0 && (
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-2">
                      {user.preferences.learning.learningChallenges.map((challenge, index) => (
                        <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-accent/10 text-accent border border-accent/20">
                          {challenge}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {user.preferences.learning.learningChallengesText && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Additional Details</p>
                    <p className="text-sm text-foreground italic">&quot;{user.preferences.learning.learningChallengesText}&quot;</p>
                  </div>
                )}
              </div>
            )}

            {/* Personality Profile */}
            {user.preferences.learning.personalityProfile && (
              <div className="p-4 bg-background rounded-xl border border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">Personality Profile</h3>
                <div className="space-y-3">
                  {user.preferences.learning.personalityProfile.conscientiousness !== undefined && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-foreground">Conscientiousness</span>
                        <span className="text-sm font-medium text-accent">{user.preferences.learning.personalityProfile.conscientiousness.toFixed(1)}/7</span>
                      </div>
                      <div className="w-full bg-secondary/30 rounded-full h-2">
                        <div 
                          className="bg-accent rounded-full h-2 transition-all" 
                          style={{ width: `${(user.preferences.learning.personalityProfile.conscientiousness / 7) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {user.preferences.learning.personalityProfile.emotionalStability !== undefined && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-foreground">Emotional Stability</span>
                        <span className="text-sm font-medium text-accent">{user.preferences.learning.personalityProfile.emotionalStability.toFixed(1)}/7</span>
                      </div>
                      <div className="w-full bg-secondary/30 rounded-full h-2">
                        <div 
                          className="bg-accent rounded-full h-2 transition-all" 
                          style={{ width: `${(user.preferences.learning.personalityProfile.emotionalStability / 7) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {user.preferences.learning.personalityProfile.selfEfficacy !== undefined && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-foreground">Self-Efficacy</span>
                        <span className="text-sm font-medium text-accent">{user.preferences.learning.personalityProfile.selfEfficacy.toFixed(1)}/7</span>
                      </div>
                      <div className="w-full bg-secondary/30 rounded-full h-2">
                        <div 
                          className="bg-accent rounded-full h-2 transition-all" 
                          style={{ width: `${(user.preferences.learning.personalityProfile.selfEfficacy / 7) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {user.preferences.learning.personalityProfile.masteryOrientation !== undefined && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-foreground">Mastery Orientation</span>
                        <span className="text-sm font-medium text-accent">{user.preferences.learning.personalityProfile.masteryOrientation.toFixed(1)}/7</span>
                      </div>
                      <div className="w-full bg-secondary/30 rounded-full h-2">
                        <div 
                          className="bg-accent rounded-full h-2 transition-all" 
                          style={{ width: `${(user.preferences.learning.personalityProfile.masteryOrientation / 7) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {user.preferences.learning.personalityProfile.performanceOrientation !== undefined && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-foreground">Performance Orientation</span>
                        <span className="text-sm font-medium text-accent">{user.preferences.learning.personalityProfile.performanceOrientation.toFixed(1)}/7</span>
                      </div>
                      <div className="w-full bg-secondary/30 rounded-full h-2">
                        <div 
                          className="bg-accent rounded-full h-2 transition-all" 
                          style={{ width: `${(user.preferences.learning.personalityProfile.performanceOrientation / 7) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Material & Time Preferences */}
            {(Array.isArray(user.preferences.learning.preferredMaterialsRanked) && user.preferences.learning.preferredMaterialsRanked.length > 0 || user.preferences.learning.dailyTimeMinutes) && (
              <div className="p-4 bg-background rounded-xl border border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">Material & Time Preferences</h3>
                
                {user.preferences.learning.preferredMaterialsRanked && user.preferences.learning.preferredMaterialsRanked.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-2">Preferred Materials (Ranked)</p>
                    <div className="flex flex-wrap gap-2">
                      {user.preferences.learning.preferredMaterialsRanked.map((material, index) => (
                        <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-accent/10 text-accent border border-accent/20">
                          <span className="mr-1.5 font-semibold">#{index + 1}</span>
                          {material}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {user.preferences.learning.dailyTimeMinutes !== undefined && user.preferences.learning.dailyTimeMinutes > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Daily Time Commitment</p>
                    <p className="text-sm text-foreground font-medium">
                      {user.preferences.learning.dailyTimeMinutes >= 60 
                        ? `${Math.floor(user.preferences.learning.dailyTimeMinutes / 60)}h ${user.preferences.learning.dailyTimeMinutes % 60}m`
                        : `${user.preferences.learning.dailyTimeMinutes} minutes`
                      } per day
                    </p>
                  </div>
                )}
              </div>
            )}


          </div>
        ) : (
          <div className="p-8 bg-background rounded-xl border border-border text-center">
            <p className="text-muted-foreground mb-4">You haven&apos;t completed your learning profile yet.</p>
            <Button 
              onClick={() => window.location.href = '/onboarding'}
              variant="primary"
            >
              Complete Onboarding
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

      {/* Clarity Mode Section */}
      <div className="bg-card-bg rounded-2xl p-6 border border-border mb-6">
        {(() => {
          const isUnset = !windowStart || !windowEnd;
          const durationMinutes = isUnset ? 0 : calcDuration(windowStart, windowEnd);
          const durationOk = !isUnset && durationMinutes >= 15 && durationMinutes <= 8 * 60;
          const headerTimezone = savedTimezone || resolveTimezone();
          const headerStatus = durationOk
            ? `${durationMinutes}-minute window · ${headerTimezone.replace('_', ' ')}`
            : null;
          return (
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-accent" aria-hidden="true" />
                  Clarity Mode
                </h2>
                <p className="text-sm text-muted-foreground">
                  Studying inside your Clarity Mode hours earns the Gold day tier on your heatmap.
                  We&apos;ll send one supportive nudge 15 minutes before it opens.
                </p>
              </div>
              {headerStatus && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 text-accent px-3 py-1 text-xs font-medium shrink-0"
                  aria-label={`Current Clarity Mode: ${headerStatus}`}
                >
                  <Timer className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{headerStatus}</span>
                </span>
              )}
            </div>
          );
        })()}

        {(() => {
          const isUnset = !windowStart || !windowEnd;
          const durationMinutes = isUnset ? 0 : calcDuration(windowStart, windowEnd);
          const durationOk = !isUnset && durationMinutes >= 15 && durationMinutes <= 8 * 60;
          const dirty =
            hasSavedContract &&
            (windowStart !== savedWindowStart || windowEnd !== savedWindowEnd);
          const budgetExhausted =
            hasSavedContract &&
            editsRemaining !== null &&
            editsRemaining === 0 &&
            !pendingContract;
          const hasPending = !!pendingContract;
          const saveDisabled =
            isSavingContract ||
            isClearingContract ||
            !durationOk ||
            (hasSavedContract && !dirty) ||
            budgetExhausted ||
            hasPending;
          const activeTimezone = savedTimezone || resolveTimezone();
          const statusCopy = durationOk
            ? `${durationMinutes}-minute window · ${activeTimezone.replace('_', ' ')}`
            : isUnset
            ? 'Pick a stretch between 15 minutes and 8 hours when you can reliably show up.'
            : 'Window must be 15 minutes to 8 hours.';
          const saveLabel = isSavingContract
            ? 'Saving…'
            : hasSavedContract
            ? 'Save for tomorrow'
            : 'Save window';

          const editsLeftCopy =
            editsRemaining === null || editBudgetMax === null
              ? null
              : editsRemaining === 0
              ? `No edits left this week${editsResetAt ? ` · resets ${formatResetWhen(editsResetAt)}` : ''}.`
              : `${editsRemaining} edit${editsRemaining === 1 ? '' : 's'} left this week${editsResetAt ? ` · resets ${formatResetWhen(editsResetAt)}` : ''}.`;

          const pendingBannerCopy = pendingContract
            ? `New window: ${formatHHMM12(pendingContract.windowStart)} – ${formatHHMM12(pendingContract.windowEnd)}. Takes effect at ${formatEffectiveAt(pendingContract.effectiveAt, pendingContract.timezone)}.`
            : null;

          const presets: { label: string; start: string; end: string }[] = [
            { label: 'Morning · 7:00–8:00 AM', start: '07:00', end: '08:00' },
            { label: 'Midday · 12:00–12:45 PM', start: '12:00', end: '12:45' },
            { label: 'Evening · 8:00–9:00 PM', start: '20:00', end: '21:00' },
          ];

          const applyPreset = (start: string, end: string) => {
            setWindowStart(start);
            setWindowEnd(end);
            setContractError(null);
          };

          return (
            <div className="p-4 bg-background rounded-xl border border-border">
              {pendingBannerCopy && (
                <div className="mb-4 rounded-lg border-l-4 border-accent bg-accent/5 px-4 py-3 flex items-start gap-3">
                  <Clock className="w-4 h-4 shrink-0 text-accent mt-0.5" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">Changes saved for tomorrow</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{pendingBannerCopy}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelPendingChange}
                    disabled={isCancellingPending || isSavingContract || isClearingContract}
                    className="text-xs font-medium text-accent hover:text-accent/80 hover:underline transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {isCancellingPending ? 'Cancelling…' : 'Cancel change'}
                  </button>
                </div>
              )}

              {isUnset && !hasSavedContract && (
                <div className="mb-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                    Quick picks
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {presets.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => applyPreset(p.start, p.end)}
                        disabled={!contractLoaded || isSavingContract || isClearingContract}
                        className="inline-flex items-center px-3 py-1.5 rounded-full border border-border bg-card-bg text-sm text-foreground hover:border-accent hover:text-accent transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <label className="block">
                  <span className="block text-sm font-medium text-foreground mb-2">Start</span>
                  <input
                    type="time"
                    value={windowStart}
                    onChange={(e) => {
                      setWindowStart(e.target.value);
                      setContractError(null);
                    }}
                    disabled={!contractLoaded || isSavingContract || isClearingContract}
                    className="w-full px-4 py-3 bg-card-bg border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-card-bg focus:ring-accent transition-colors tabular-nums cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Clarity Mode start time"
                  />
                </label>
                <label className="block">
                  <span className="block text-sm font-medium text-foreground mb-2">End</span>
                  <input
                    type="time"
                    value={windowEnd}
                    onChange={(e) => {
                      setWindowEnd(e.target.value);
                      setContractError(null);
                    }}
                    disabled={!contractLoaded || isSavingContract || isClearingContract}
                    className="w-full px-4 py-3 bg-card-bg border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-card-bg focus:ring-accent transition-colors tabular-nums cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Clarity Mode end time"
                  />
                </label>
              </div>

              {!durationOk && (
                <div className="rounded-lg border border-border bg-card-bg px-3 py-2 mb-3 text-xs text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0 text-muted-foreground/50" aria-hidden="true" />
                  <span>{statusCopy}</span>
                </div>
              )}

              {hasSavedContract && !hasPending && editsLeftCopy && (
                <div className={`mb-3 rounded-lg border px-3 py-2 text-xs flex items-center gap-2 ${
                  budgetExhausted
                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200'
                    : 'border-border bg-card-bg text-muted-foreground'
                }`}>
                  {budgetExhausted ? (
                    <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
                  )}
                  <span>{editsLeftCopy}</span>
                </div>
              )}

              {contractError && (
                <div className="mb-3 text-sm text-red-600 dark:text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
                  {contractError}
                </div>
              )}

              <div className="flex flex-wrap gap-2 items-center">
                <Button
                  variant="primary"
                  onClick={handleSaveStudyWindow}
                  disabled={saveDisabled}
                  className="min-w-[120px]"
                >
                  {saveLabel}
                </Button>
                {hasSavedContract && (
                  <Button
                    variant="ghost"
                    onClick={handleClearStudyWindow}
                    disabled={isSavingContract || isClearingContract}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {isClearingContract ? 'Clearing…' : 'Clear window'}
                  </Button>
                )}
              </div>

              {hasSavedContract && !hasPending && dirty && !budgetExhausted && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Changes take effect at midnight so today&apos;s gold credit stays honest.
                </p>
              )}

              <div className="mt-5 pt-4 border-t border-border flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <Wind className="w-4 h-4 text-accent mt-0.5 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground">Pre-session breathing warm-up</p>
                      <div className="relative group">
                        <button
                          type="button"
                          aria-expanded={breathingInfoOpen}
                          aria-label="Why a breathing warm-up?"
                          onClick={() => setBreathingInfoOpen((v) => !v)}
                          onBlur={() => setBreathingInfoOpen(false)}
                          className="inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          <Info className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <div
                          role="tooltip"
                          className={`absolute left-0 top-full mt-2 w-[min(calc(100vw-2rem),18rem)] p-3 rounded-lg bg-card-bg border border-border shadow-lg text-xs text-muted-foreground transition-all duration-200 z-50 group-hover:opacity-100 group-hover:visible ${breathingInfoOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                        >
                          <p className="font-medium text-foreground mb-1">Why it helps</p>
                          <p>Based on a 2024 meta-analysis of 111 randomised trials (9,500+ participants) showing brief mindfulness breathing improves sustained attention and working memory. (Scientific Reports, 2024)</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Shows a 5-minute breathing exercise 5 minutes before Clarity Mode starts. Skip or dismiss anytime — never interrupts your session.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={breathing.enabled}
                    onChange={(e) => breathing.setEnabled(e.target.checked)}
                    aria-label="Toggle pre-session breathing warm-up"
                  />
                  <div className="w-11 h-6 bg-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent" />
                </label>
              </div>

              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <Volume2 className="w-4 h-4 text-accent mt-0.5 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground">Ambient sound</p>
                      <div className="relative group">
                        <button
                          type="button"
                          aria-expanded={ambientInfoOpen}
                          aria-label="Why white noise?"
                          onClick={() => setAmbientInfoOpen((v) => !v)}
                          onBlur={() => setAmbientInfoOpen(false)}
                          className="inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          <Info className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                        <div
                          role="tooltip"
                          className={`absolute left-0 top-full mt-2 w-[min(calc(100vw-2rem),18rem)] p-3 rounded-lg bg-card-bg border border-border shadow-lg text-xs text-muted-foreground transition-all duration-200 z-50 group-hover:opacity-100 group-hover:visible ${ambientInfoOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                        >
                          <p className="font-medium text-foreground mb-1">Why ambient sound?</p>
                          <p>A steady rhythm your brain locks onto, making it easier to stay in the zone. Keep the volume soft, just enough to hear it, so it fades into the background rather than becoming a distraction itself. Headphones work best, and most people notice the difference within a few minutes.</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Show a play/pause control during Clarity Mode.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={ambientEnabled}
                    onChange={(e) => setAmbientEnabled(e.target.checked)}
                    aria-label="Toggle ambient sound control in Clarity Mode"
                  />
                  <div className="w-11 h-6 bg-border peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent" />
                </label>
              </div>
            </div>
          );
        })()}
      </div>

      {/* General Preferences Section */}
      <div className="bg-card-bg rounded-2xl p-6 border border-border mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-6">General Preferences</h2>
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
        isLockedOut={isPasswordLockedOut}
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
