'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  preferences?: import('./models/User').IUserPreferences;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string, rememberMe: boolean) => Promise<void>;
  signup: (data: {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    userType: 'Graduate' | 'Undergraduate' | 'Other';
    customUserType?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string, rememberMe: boolean) => {
    const response = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, rememberMe }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const result = await response.json();
    const authenticatedUser = result.user;

    // Update local state
    setUser(authenticatedUser);

    // Redirect based on onboarding completion
    // Check if learning preferences exist AND have actual meaningful data
    const hasLearningPreferences = !!(
      authenticatedUser.preferences?.learning &&
      (
        // Check if any of these fields have actual data
        (authenticatedUser.preferences.learning.role) ||
        (authenticatedUser.preferences.learning.learningGoals && authenticatedUser.preferences.learning.learningGoals.length > 0) ||
        (authenticatedUser.preferences.learning.preferredMaterialsRanked && authenticatedUser.preferences.learning.preferredMaterialsRanked.length > 0) ||
        (authenticatedUser.preferences.learning.dailyTimeMinutes && authenticatedUser.preferences.learning.dailyTimeMinutes > 0) ||
        (authenticatedUser.preferences.learning.personalityProfile &&
         Object.keys(authenticatedUser.preferences.learning.personalityProfile).length > 0 &&
         Object.values(authenticatedUser.preferences.learning.personalityProfile).some(v => v !== undefined))
      )
    );

    if (!hasLearningPreferences) {
      router.push('/onboarding');
    } else {
      router.push('/dashboard');
    }
  };

  const signup = async (data: {
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    userType: 'Graduate' | 'Undergraduate' | 'Other';
    customUserType?: string;
  }) => {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      if (error.errors) {
        // Field-specific validation errors
        throw error.errors;
      }
      throw new Error(error.message || 'Signup failed');
    }

    const result = await response.json();
    const newUser = result.user;

    // Update local state
    setUser(newUser);

    // Redirect to onboarding if user hasn't completed learning preferences, otherwise to dashboard
    // Check if learning preferences exist AND have actual meaningful data
    console.log('Signup - newUser.preferences:', JSON.stringify(newUser.preferences, null, 2));

    const hasLearningPreferences = !!(
      newUser.preferences?.learning &&
      (
        // Check if any of these fields have actual data
        (newUser.preferences.learning.role) ||
        (newUser.preferences.learning.learningGoals && newUser.preferences.learning.learningGoals.length > 0) ||
        (newUser.preferences.learning.preferredMaterialsRanked && newUser.preferences.learning.preferredMaterialsRanked.length > 0) ||
        (newUser.preferences.learning.dailyTimeMinutes && newUser.preferences.learning.dailyTimeMinutes > 0) ||
        (newUser.preferences.learning.personalityProfile &&
         Object.keys(newUser.preferences.learning.personalityProfile).length > 0 &&
         Object.values(newUser.preferences.learning.personalityProfile).some(v => v !== undefined))
      )
    );

    console.log('Signup - hasLearningPreferences:', hasLearningPreferences);

    if (!hasLearningPreferences) {
      console.log('Signup - Redirecting to /onboarding');
      router.push('/onboarding');
    } else {
      console.log('Signup - Redirecting to /dashboard');
      router.push('/dashboard');
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/');
  };

  const refreshUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}