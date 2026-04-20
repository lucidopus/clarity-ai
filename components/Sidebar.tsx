'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion'; // still used for layoutId indicator + opacity fade
import { ChevronLeft, Menu, LogOut } from 'lucide-react';
import { primaryNavItems } from '@/lib/navigation/primary-nav';
import { Z_INDEX } from '@/lib/constants/z-index';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  // Default to expanded so SSR and client first-render agree (no hydration
  // mismatch). After mount, auto-collapse if the viewport is in the tablet
  // range (md-to-lg-) — a 256-px expanded sidebar eats 31% of an 810-px
  // iPad portrait. Ran once on mount so window-snapping / iPad multitasking
  // doesn't re-collapse after the user manually expands. Brief flash from
  // w-56 to w-20 on tablet first paint is acceptable vs. a hydration warning.
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(max-width: 1023px)').matches) {
      // One-time viewport-aware bootstrap — not a reactive subscription.
      // Does not listen to resize, which is by design (prevents iPad
      // multitasking window-snap flicker after user manually expands).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsCollapsed(true);
    }
  }, []);

  return (
    <aside
      style={{ zIndex: Z_INDEX.sidebar }}
      className={`hidden md:flex bg-card-bg border-r border-border shrink-0 flex-col h-dvh sticky top-0 overflow-hidden transition-[width] duration-200 ease-out ${isCollapsed ? 'w-20' : 'w-56 lg:w-64'}`}
    >
      {/* Sidebar Header: Logo & Toggle */}
      <div className="h-16 flex items-center px-4 border-b border-border shrink-0 justify-between">
         <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'justify-center w-full' : ''}`}>
            <Link href="/" className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity">
                    <span className="text-white font-bold text-lg">C</span>
                </div>
                {!isCollapsed && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="font-bold text-lg text-foreground truncate"
                    >
                        Clarity
                    </motion.div>
                )}
            </Link>
         </div>
         
         {!isCollapsed && (
           <button
              onClick={() => setIsCollapsed(true)}
              className="inline-flex items-center justify-center min-h-11 min-w-11 text-muted-foreground hover:text-foreground rounded-md hover:bg-background transition-colors cursor-pointer"
              title="Collapse Sidebar"
              aria-label="Collapse sidebar"
           >
              <ChevronLeft className="w-4 h-4" />
           </button>
         )}
      </div>

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 gap-2 flex flex-col">
          {/* Expand Button (only visible when collapsed) */}
          {isCollapsed && (
             <button
              onClick={() => setIsCollapsed(false)}
              className="w-full flex items-center justify-center min-h-11 py-2 text-muted-foreground hover:text-foreground hover:bg-accent/10 rounded-lg mb-2 cursor-pointer transition-colors"
              title="Expand Sidebar"
              aria-label="Expand sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : ''}
                className={`
                  relative group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 cursor-pointer
                  ${isActive 
                    ? 'bg-accent/10 text-accent font-medium' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'
                  }
                  ${isCollapsed ? 'justify-center' : ''}
                `}
              >
                <Icon className={`shrink-0 ${isActive ? 'w-5 h-5' : 'w-5 h-5 opacity-70'}`} />
                
                {!isCollapsed && (
                   <span className="truncate text-sm">{item.name}</span>
                )}

                {/* Active Indicator Line for Collapsed Mode */}
                {isActive && isCollapsed && (
                  <motion.div 
                    layoutId="activeTabIndicator"
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent rounded-l-full"
                  />
                )}
              </Link>
            );
          })}
      </div>
      
      {/* Sidebar Footer: User Section */}
      <div className="p-3 border-t border-border shrink-0 space-y-2">
          {!isCollapsed && (
            <div className="mb-2 px-1">
               <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Account</h3>
            </div>
          )}
           
          <div className={`flex flex-col gap-2 ${isCollapsed ? 'items-center' : ''}`}>
               {/* User Info / Profile Link (optional, currently just shows email in old one) */} 
               {!isCollapsed && user && (
                   <div className="px-1 py-2 text-xs text-muted-foreground truncate w-full bg-muted/30 rounded-lg mb-1">
                       {user.email}
                   </div>
               )}

               <button
                  onClick={logout}
                  className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors text-red-500/80 hover:text-red-500 hover:bg-red-500/10 cursor-pointer ${isCollapsed ? 'justify-center' : ''}`}
                  title="Logout"
               >
                  <LogOut className="w-4 h-4 shrink-0" />
                  {!isCollapsed && <span>Logout</span>}
               </button>
          </div>
      </div>
    </aside>
  );
}
