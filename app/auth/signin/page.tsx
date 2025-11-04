'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import Button from '@/components/Button';
import Card from '@/components/Card';

export default function SigninPage() {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.username, formData.password, formData.rememberMe);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Sign in to your account</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 flex flex-col">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-foreground mb-1">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="rememberMe"
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleChange}
              className="h-4 w-4 text-accent focus:ring-accent border-border rounded"
            />
            <label htmlFor="rememberMe" className="ml-2 block text-sm text-foreground">
              Remember me
            </label>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col">
            <Button variant="outline" className="w-full">
              <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M44.5 20H24v8h11.3c-1.6 5.2-6.4 9-11.3 9-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.2l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22 22-9.8 22-22c0-1.3-.2-2.7-.5-4z" fill="#FFC107"/>
                <path d="M44.5 20H24v8h11.3c-1.6 5.2-6.4 9-11.3 9-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.2l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22 22-9.8 22-22c0-1.3-.2-2.7-.5-4z" fill="url(#paint0_linear_103_2)"/>
                <path d="M10.2 28.9c-.5-1.5-.8-3.1-.8-4.9s.3-3.4.8-4.9l-6.4-6.4C2.2 16.1 1 20 1 24s1.2 7.9 3.8 11.3l6.4-6.4z" fill="#FF3D00"/>
                <path d="M24 48c6.6 0 12.2-2.2 16.2-5.9l-6.4-6.4c-2.2 1.5-5 2.4-8.2 2.4-6.4 0-11.8-4.3-13.7-10.2l-6.6 5.2C6.2 41.1 14.4 48 24 48z" fill="#4CAF50"/>
                <path d="M44.5 20H24v8h11.3c-1.6 5.2-6.4 9-11.3 9-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.2l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c6.6 0 12.2-2.2 16.2-5.9l-6.4-6.4c-2.2 1.5-5 2.4-8.2 2.4-6.4 0-11.8-4.3-13.7-10.2l-6.6 5.2C6.2 41.1 14.4 48 24 48z" fill="#1976D2"/>
                <defs>
                  <linearGradient id="paint0_linear_103_2" x1="0" y1="0" x2="1" y2="1">
                    <stop stop-color="#FFC107"/>
                    <stop offset="1" stop-color="#FFC107" stop-opacity="0"/>
                  </linearGradient>
                </defs>
              </svg>
              Google
            </Button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-accent hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}