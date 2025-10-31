'use client';

import { useAuth } from '@/lib/auth-context';
import DashboardHeader from '@/components/DashboardHeader';
import Button from '@/components/Button';
import { useState, useEffect } from 'react';

export default function DashboardHomePage() {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState('Welcome');

  useEffect(() => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      setGreeting('Good Morning');
    } else if (hour >= 12 && hour < 17) {
      setGreeting('Good Afternoon');
    } else {
      setGreeting('Good Evening');
    }
  }, []);

  if (!user) return null;

  return (
    <div>
      {/* Page Header */}
      <DashboardHeader
        title={`${greeting}, ${user.firstName}`}
      />

      {/* Empty State */}
      <div className="bg-card-bg rounded-2xl p-12 border border-border text-center">
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-10 h-10 text-accent"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No learning materials yet</h3>
          <p className="text-muted-foreground mb-6">
            Your stats, progress, and recent activity will appear here once you start generating materials.
          </p>
          <Button href="/dashboard/generate" variant="primary">
            Generate Your First Material
          </Button>
        </div>
      </div>
    </div>
  );
}
