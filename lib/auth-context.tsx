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
  error: Error | null;
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
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async (retryCount = 0) => {
    try {
      setError(null);
      const response = await fetch('/api/auth/me');
      
      if (response.status === 500) {
        throw new Error('Server error');
      }

      if (!response.ok) {
        // If 401/403 or other non-500 error, just treat as not logged in
        setUser(null);
        return;
      }

      const data = await response.json();
      setUser(data.user);
    } catch (error) {
      console.error('Auth check failed:', error);
      
      // Retry logic for server errors or network issues
      if (retryCount < 3) {
        setTimeout(() => {
          checkAuth(retryCount + 1);
        }, 1000 * (retryCount + 1)); // Exponential backoff: 1s, 2s, 3s
        return; // Don't turn off loading yet
      }

      setError(error instanceof Error ? error : new Error('Failed to verify session'));
    } finally {
      // Only set loading to false if we are not retrying
      if (retryCount >= 3 || (error === null)) { 
        // Logic trick: We can't easily peek into the future 'catch' block's decision to retry 
        // inside 'finally', so we need to be careful.
        // Actually, the simpler way is to handle loading inside try/catch properly.
      }
    }
  };

  // Refactored checkAuth to be more robust
  const checkAuthRobust = async () => {
     try {
       await performAuthCheck();
     } finally {
        setLoading(false);
     }
  };

  const performAuthCheck = async (attempt = 1): Promise<void> => {
     try {
       const response = await fetch('/api/auth/me');
       
       if (response.status >= 500) {
         throw new Error(`Server error: ${response.status}`);
       }
       
       const data = await response.json();
       setUser(data.user);
       setError(null);
     } catch (err) {
       if (attempt < 3) {
         await new Promise(resolve => setTimeout(resolve, attempt * 1000));
         return performAuthCheck(attempt + 1);
       }
       console.error('Auth check failed after retries:', err);
       setError(err instanceof Error ? err : new Error('Connection failed'));
     }
  };

  useEffect(() => {
    checkAuthRobust();
  }, []);

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
    <AuthContext.Provider value={{ user, loading, error, login, signup, logout, refreshUser }}>
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