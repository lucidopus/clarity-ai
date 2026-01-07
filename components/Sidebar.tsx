'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Compass, 
  Library, 
  Settings, 
  ChevronLeft, 
  Menu, 
  LogOut,
  User
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  {
    name: 'Home',
    href: '/dashboard/home',
    icon: Home,
  },
  {
    name: 'Discover',
    href: '/dashboard/discover',
    icon: Compass,
  },
  {
    name: 'Library',
    href: '/dashboard/gallery',
    icon: Library,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const router = useRouter();

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 256 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="bg-card-bg border-r border-border shrink-0 z-40 flex flex-col h-screen sticky top-0"
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
              className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-background transition-colors cursor-pointer"
              title="Collapse Sidebar"
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
              className="w-full flex items-center justify-center py-2 text-muted-foreground hover:text-foreground hover:bg-accent/10 rounded-lg mb-2 cursor-pointer transition-colors"
              title="Expand Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {navItems.map((item) => {
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
    </motion.aside>
  );
}
