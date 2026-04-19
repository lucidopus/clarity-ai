import { Home, Compass, Library, Settings, type LucideIcon } from 'lucide-react';

export interface PrimaryNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

/**
 * Single source of truth for the authed user's primary navigation.
 * Consumed by the desktop Sidebar (components/Sidebar.tsx), the mobile
 * BottomNav (components/MobileBottomNav.tsx), and the mobile Drawer.
 */
export const primaryNavItems: PrimaryNavItem[] = [
  { name: 'Home', href: '/dashboard/home', icon: Home },
  { name: 'Discover', href: '/dashboard/discover', icon: Compass },
  { name: 'Library', href: '/dashboard/gallery', icon: Library },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];
