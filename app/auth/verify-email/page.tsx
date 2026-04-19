'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getUserFriendlyMessage } from '@/lib/utils/user-error';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Link from 'next/link';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  
  const email = searchParams.get('email') || '';
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Mask email for display
  const maskedEmail = email.replace(/(^.{2}).+(@.+)/, '$1***$2');

  // Auto-send verification email on mount if arriving from sign-in or redirect
  // (signup already sends one, so we check for a 'source' param to avoid double-send)
  // Use a ref instead of state to prevent React Strict Mode double-invocation from sending 2 OTPs
  const autoSentRef = useRef(false);
  const source = searchParams.get('source');

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  useEffect(() => {
    if (!email || autoSentRef.current) return;
    // Only auto-send when coming from sign-in or a protected route redirect
    if (source === 'signin' || source === 'redirect') {
      autoSentRef.current = true;
      const sendInitialCode = async () => {
        try {
          const response = await fetch('/api/auth/resend-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
          const data = await response.json();
          if (response.ok) {
            setSuccess('Verification code sent! Please check your email.');
            setResendCooldown(60);
          } else if (response.status === 429) {
            // Token was recently sent, show cooldown
            const match = data.message?.match(/wait (\d+)s/);
            setResendCooldown(match ? parseInt(match[1]) : 60);
          }
        } catch {
          // Silent fail — user can still manually resend
        }
      };
      sendInitialCode();
    }
  }, [email, source]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
    if (pastedData.length === 0) return;

    const newOtp = [...otp];
    pastedData.forEach((digit, i) => {
      if (i < 6) newOtp[i] = digit;
    });
    setOtp(newOtp);

    // Focus the last filled input or the next empty one
    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleChange = (index: number, value: string) => {
    // Handle single digit input
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance focus
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Backspace: if empty, move to previous
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyEmail = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the full 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      setSuccess('Email verified successfully! Redirecting...');
      
      // Refresh auth context to get the user
      await refreshUser();
      
      // Redirect to onboarding or dashboard
      // We can inspect the user data from response or let auth context handle it
      // For now, consistent with login logic:
      const user = data.user;
       const hasLearningPreferences = !!(
        user.preferences?.learning &&
        (
          (user.preferences.learning.role) ||
          (user.preferences.learning.learningGoals && user.preferences.learning.learningGoals.length > 0)
        )
      );

      setTimeout(() => {
        if (hasLearningPreferences) {
            router.push('/dashboard');
        } else {
            router.push('/onboarding');
        }
      }, 1500);

    } catch (err) {
      setError(getUserFriendlyMessage(err, 'We couldn\'t verify your code. Please check the code and try again.'));
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If rate limited, set cooldown
        if (response.status === 429) {
          const match = data.message.match(/wait (\d+)s/);
          if (match) {
            setResendCooldown(parseInt(match[1]));
          } else {
             setResendCooldown(60); 
          }
        }
        throw new Error(data.message || 'Failed to resend code');
      }

      setSuccess('Verification code sent! Please check your email.');
      setResendCooldown(60); // 1 minute cooldown

    } catch (err) {
      setError(getUserFriendlyMessage(err, 'We couldn\'t send a new code. Please try again in a moment.'));
    } finally {
      setLoading(false);
    }
  };

  const isComplete = otp.every(digit => digit !== '');

  return (
    <Card className="w-full max-w-md p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">Check your email</h1>
        <p className="text-muted-foreground">
          We&apos;ve sent a verification code to <br />
          <span className="font-medium text-foreground">{maskedEmail || email}</span>
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
              ref={el => {
                inputRefs.current[index] = el;
              }}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className="w-12 h-12 text-center text-2xl font-bold border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-all"
            />
          ))}
        </div>

        {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm text-center">
                {error}
            </div>
        )}

        {success && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 text-sm text-center">
                {success}
            </div>
        )}

        <Button 
            onClick={verifyEmail} 
            variant="primary" 
            className="w-full" 
            disabled={loading || !isComplete}
        >
          {loading ? 'Verifying...' : 'Verify Email'}
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          Didn&apos;t receive the code?{' '}
          <button
            onClick={resendCode}
            disabled={loading || resendCooldown > 0}
            className={`font-medium ${resendCooldown > 0 ? 'text-muted-foreground cursor-not-allowed' : 'text-accent hover:underline cursor-pointer'}`}
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Click to resend'}
          </button>
        </div>

        <div className="text-center mt-4 text-sm text-muted-foreground">
             Back to{' '}
             <Link href="/auth/signup" className="font-medium text-accent hover:underline">
                 Sign Up
             </Link>
        </div>
      </div>
    </Card>
  );
}

// Main page component wrapped in Suspense because we use useSearchParams
export default function VerifyEmailPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4">
      <Suspense fallback={<Card className="w-full max-w-md p-8 text-center">Loading...</Card>}>
        <VerifyEmailForm />
      </Suspense>
    </div>
  );
}
