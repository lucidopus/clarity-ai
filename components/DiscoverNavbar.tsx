'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect } from 'react';
import ThemeToggle from './ThemeToggle';
import { useRouter } from 'next/navigation';
import Button from './Button';
import { Search, ArrowLeft } from 'lucide-react';

interface DiscoverNavbarProps {
  title?: string;
  subtitle?: string;
  initialQuery?: string;
  showBackButton?: boolean;
}

export default function DiscoverNavbar({ title = "Discover", subtitle, initialQuery, showBackButton }: DiscoverNavbarProps) {
  useAuth(); // Keep hook for potential future usage
  const router = useRouter();
  
  const openGlobalSearch = () => {
    window.dispatchEvent(new Event('open-global-search'));
  };

  // Keyboard shortcut listener (Cmd+K)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        openGlobalSearch();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Determine layout mode based on whether we are showing results (initialQuery present)
  const isSearchMode = !!initialQuery;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-border">

      {/* Left: Title OR Back Button */}
      <div className="min-w-0">
        {showBackButton ? (
            <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/discover')}
                className="gap-2 pl-0 text-muted-foreground hover:text-foreground"
            >
                <ArrowLeft className="w-4 h-4" />
                <span className="font-medium">Back to Discover</span>
            </Button>
        ) : (
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">{title}</h1>
                {subtitle && <p className="text-sm sm:text-base text-muted-foreground">{subtitle}</p>}
            </div>
        )}
      </div>

      {/* Center/Right: Actions & Search — hidden on mobile; MobileTopBar
           already provides search + theme toggle at the dashboard shell level,
           so duplicating them here would stack two search pills. */}
      <div className="hidden sm:flex items-center gap-4">

        {/* Sleek Search Trigger */}
        <div
          onClick={openGlobalSearch}
          className={`
            group relative flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all duration-300 min-h-11
            ${isSearchMode
                ? 'sm:w-80 bg-secondary/10 border-accent/20 border hover:border-accent'
                : 'sm:w-64 bg-secondary/10 hover:bg-secondary/20 border border-transparent hover:border-border'
            }
            rounded-full
          `}
        >
          <Search className={`w-4 h-4 ${isSearchMode ? 'text-accent' : 'text-muted-foreground'} group-hover:text-foreground transition-colors`} />
          <span className={`text-sm ${isSearchMode ? 'text-foreground font-medium truncate' : 'text-muted-foreground'} group-hover:text-foreground transition-colors`}>
            {initialQuery || 'Search...'}
          </span>
          
          <div className="absolute right-3 flex items-center gap-1">
             {!initialQuery && (
               <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded bg-background/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                 <span className="text-xs">⌘</span>K
               </kbd>
             )}
          </div>
        </div>

        <div className="h-6 w-px bg-border mx-2" />

        <ThemeToggle />
      </div>
    </div>
  );
}
