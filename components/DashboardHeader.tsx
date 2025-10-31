'use client';

import { useAuth } from '@/lib/auth-context';
import ThemeToggle from './ThemeToggle';
import Button from './Button';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
}

export default function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  const { user, logout } = useAuth();

  return (
    <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-1">{title}</h1>
        {subtitle && subtitle !== 'undefined' && <p className="text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center space-x-4">
        <ThemeToggle />
        <Button onClick={logout} variant="ghost" size="sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
            />
          </svg>
        </Button>
      </div>
    </div>
  );
}
