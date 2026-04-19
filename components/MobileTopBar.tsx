'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { Z_INDEX } from '@/lib/constants/z-index';

interface MobileTopBarProps {
  onOpenSearch?: () => void;
  title?: string;
}

/**
 * Slim sticky app bar for the authed dashboard shell on mobile.
 * Logo on the left, search + theme toggle on the right. Primary navigation
 * lives in MobileBottomNav; account actions (logout) live on the Settings
 * page, so we do not render a hamburger/drawer here.
 */
export default function MobileTopBar({ onOpenSearch, title }: MobileTopBarProps) {
  return (
    <div
      style={{
        zIndex: Z_INDEX.topBar,
        paddingTop: 'env(safe-area-inset-top)',
      }}
      className="md:hidden sticky top-0 bg-background/90 backdrop-blur-md border-b border-border"
    >
      <div className="flex items-center justify-between h-14 px-3">
        <Link
          href="/dashboard/home"
          className="flex items-center gap-2 min-w-0 px-2"
          aria-label="Home"
        >
          <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="font-semibold text-foreground text-sm truncate">
            {title ?? 'Clarity'}
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {onOpenSearch && (
            <button
              onClick={onOpenSearch}
              aria-label="Search"
              className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg text-foreground hover:bg-card-bg transition-colors cursor-pointer"
            >
              <Search className="w-5 h-5" />
            </button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
