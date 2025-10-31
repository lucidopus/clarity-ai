'use client';

import { useAuth } from '@/lib/auth-context';
import ThemeToggle from './ThemeToggle';
import Button from './Button';
import { Sparkles, LogOut } from 'lucide-react';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  onGenerateClick?: () => void;
}

export default function DashboardHeader({ title, subtitle, onGenerateClick }: DashboardHeaderProps) {
  const { logout } = useAuth();

  return (
    <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-1">{title}</h1>
        {subtitle && subtitle !== 'undefined' && <p className="text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center space-x-4">
        {onGenerateClick && (
          <Button onClick={onGenerateClick} variant="primary" size="sm">
            <Sparkles className="w-4 h-4 mr-2" />
            Generate
          </Button>
        )}
        <ThemeToggle />
        <Button onClick={logout} variant="ghost" size="icon" aria-label="Logout">
          <LogOut className="w-5 h-5 transform -scale-x-100" />
        </Button>
      </div>
    </div>
  );
}
