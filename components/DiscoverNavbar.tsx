'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect } from 'react';
import ThemeToggle from './ThemeToggle';
import { useRouter } from 'next/navigation';
import Button from './Button';
import { LogOut, Search, Command, ArrowLeft } from 'lucide-react';

interface DiscoverNavbarProps {
  title?: string;
  subtitle?: string;
  initialQuery?: string;
  showBackButton?: boolean;
}

export default function DiscoverNavbar({ title = "Discover", subtitle, initialQuery, showBackButton }: DiscoverNavbarProps) {
  const { logout } = useAuth();
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
    <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
      
      {/* Left: Title OR Back Button */}
      <div>
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
                <h1 className="text-3xl font-bold text-foreground mb-1">{title}</h1>
                {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
            </div>
        )}
      </div>

      {/* Center/Right: Actions & Search */}
      <div className="flex items-center space-x-4">
        
        {/* Sleek Search Trigger */}
        <div 
          onClick={openGlobalSearch}
          className={`
            group relative flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-all duration-300
            ${isSearchMode 
                ? 'w-80 bg-secondary/10 border-accent/20 border hover:border-accent' 
                : 'w-64 bg-secondary/10 hover:bg-secondary/20 border border-transparent hover:border-border'
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
