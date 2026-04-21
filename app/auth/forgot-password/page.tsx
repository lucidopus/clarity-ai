'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getUserFriendlyMessage } from '@/lib/utils/user-error';
import { validatePassword, PASSWORD_ERROR_MESSAGE } from '@/lib/utils/auth-validation';
import Button from '@/components/Button';
import Card from '@/components/Card';

type Step = 'email' | 'otp' | 'password';

function maskEmail(email: string): string {
  return email.replace(/(^.{2}).+(@.+)/, '$1***$2');
}

function ForgotPasswordFlow() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resetTicket, setResetTicket] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first OTP input when entering the OTP step
  useEffect(() => {
    if (step === 'otp') {
      otpRefs.current[0]?.focus();
    }
  }, [step]);

  // Resend cooldown ticker
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const requestCode = async (targetEmail: string): Promise<boolean> => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Unable to send reset code');
      }

      return true;
    } catch (err) {
      setError(
        getUserFriendlyMessage(
          err,
          "We couldn't send a reset code. Please try again in a moment."
        )
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    const ok = await requestCode(email.trim().toLowerCase());
    if (ok) {
      setEmail(email.trim().toLowerCase());
      setSuccess('If an account exists with that email, a reset code has been sent.');
      setResendCooldown(60);
      setStep('otp');
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, 6)
      .split('');
    if (pasted.length === 0) return;
    const next = [...otp];
    pasted.forEach((digit, i) => {
      if (i < 6) next[i] = digit;
    });
    setOtp(next);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpSubmit = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the full 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/verify-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code }),
      });
      const data = await response.json();

      if (!response.ok || !data.resetTicket) {
        throw new Error(data.message || 'Invalid or expired code');
      }

      setResetTicket(data.resetTicket);
      setSuccess('Code verified. Choose a new password.');
      setStep('password');
    } catch (err) {
      setError(
        getUserFriendlyMessage(
          err,
          "We couldn't verify that code. Please check it and try again."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    const ok = await requestCode(email);
    if (ok) {
      setSuccess('A new code has been sent.');
      setResendCooldown(60);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const check = validatePassword(newPassword);
    if (!check.isValid) {
      setError(check.error || PASSWORD_ERROR_MESSAGE);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetTicket, newPassword, confirmPassword }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Unable to reset password');
      }

      setSuccess('Password updated. Signing you in...');
      await refreshUser();

      const user = data.user;
      const hasLearningPreferences = !!(
        user?.preferences?.learning &&
        (user.preferences.learning.role ||
          (user.preferences.learning.learningGoals &&
            user.preferences.learning.learningGoals.length > 0))
      );

      setTimeout(() => {
        router.push(hasLearningPreferences ? '/dashboard' : '/onboarding');
      }, 1200);
    } catch (err) {
      setError(
        getUserFriendlyMessage(
          err,
          "We couldn't reset your password. Your reset session may have expired — please start again."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const isOtpComplete = otp.every((digit) => digit !== '');

  return (
    <Card className="w-full max-w-md p-8">
      {step === 'email' && (
        <>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Reset your password</h1>
            <p className="text-muted-foreground">
              Enter the email associated with your account and we&apos;ll send you a 6-digit code.
            </p>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm text-center">
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send reset code'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Remembered it?{' '}
            <Link href="/auth/signin" className="font-medium text-accent hover:underline">
              Sign in
            </Link>
          </div>
        </>
      )}

      {step === 'otp' && (
        <>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Check your email</h1>
            <p className="text-muted-foreground">
              We&apos;ve sent a 6-digit code to
              <br />
              <span className="font-medium text-foreground">{maskEmail(email)}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Don&apos;t see it? Check your spam or junk folder.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    otpRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  onPaste={handleOtpPaste}
                  className="w-12 h-12 text-center text-2xl font-bold border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                />
              ))}
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm text-center">
                {error}
              </div>
            )}
            {success && !error && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 text-sm text-center">
                {success}
              </div>
            )}

            <Button
              onClick={handleOtpSubmit}
              variant="primary"
              className="w-full"
              disabled={loading || !isOtpComplete}
            >
              {loading ? 'Verifying...' : 'Verify code'}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Didn&apos;t receive the code?{' '}
              <button
                onClick={handleResend}
                disabled={loading || resendCooldown > 0}
                className={`font-medium ${
                  resendCooldown > 0
                    ? 'text-muted-foreground cursor-not-allowed'
                    : 'text-accent hover:underline cursor-pointer'
                }`}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Click to resend'}
              </button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <button
                onClick={() => {
                  setStep('email');
                  setOtp(['', '', '', '', '', '']);
                  setError('');
                  setSuccess('');
                }}
                className="font-medium text-accent hover:underline cursor-pointer"
              >
                Use a different email
              </button>
            </div>
          </div>
        </>
      )}

      {step === 'password' && (
        <>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Choose a new password</h1>
            <p className="text-muted-foreground">
              At least 8 characters with an uppercase letter, a lowercase letter, a number, and a
              special character.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-foreground mb-1"
              >
                New password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="newPassword"
                  name="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full px-3 py-2 pr-10 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-foreground mb-1"
              >
                Confirm new password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full px-3 py-2 pr-10 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showConfirmPassword}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm text-center">
                {error}
              </div>
            )}
            {success && !error && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 text-sm text-center">
                {success}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading || !newPassword || !confirmPassword}
            >
              {loading ? 'Updating...' : 'Update password and sign in'}
            </Button>
          </form>
        </>
      )}
    </Card>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4">
      <Suspense
        fallback={<Card className="w-full max-w-md p-8 text-center">Loading...</Card>}
      >
        <ForgotPasswordFlow />
      </Suspense>
    </div>
  );
}
