'use client';

import { useLayoutEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { primaryNavItems, type PrimaryNavItem } from '@/lib/navigation/primary-nav';
import { Z_INDEX } from '@/lib/constants/z-index';

// useLayoutEffect runs before paint so the body attribute + CSS var cascade
// before floating elements (FAB, focus orb, live-lecture bubble) render.
// Prevents a one-frame jump where the FAB sits at bottom-4 and then snaps
// up above the bottom nav on hydration.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : () => {};

interface BottomNavItem {
  href: string;
  icon: LucideIcon;
  shortLabel?: string;
  label: string;
}

interface MobileBottomNavProps {
  items?: BottomNavItem[];
}

/**
 * Fixed bottom tab bar for the authed mobile shell. Renders only on <md.
 * Defaults to the primary nav (Home/Discover/Library/Settings); admin portal
 * passes its own list (Analytics/Costs/Users) via the `items` prop.
 */
export default function MobileBottomNav({ items }: MobileBottomNavProps) {
  const pathname = usePathname();
  const list: BottomNavItem[] = items ?? primaryNavItems.map((item: PrimaryNavItem) => ({
    href: item.href,
    icon: item.icon,
    label: item.name,
    shortLabel: item.name,
  }));

  // Flag the body so other mobile floaters (FAB, live-lecture bubble, focus
  // orb) can auto-offset above this bar via --mobile-chrome-bottom. Runs as
  // a layout effect so the CSS cascade is correct before paint.
  useIsomorphicLayoutEffect(() => {
    document.body.dataset.hasMobileNav = 'true';
    return () => {
      delete document.body.dataset.hasMobileNav;
    };
  }, []);

  return (
    <nav
      aria-label="Primary navigation"
      style={{ zIndex: Z_INDEX.bottomNav }}
      className="md:hidden fixed inset-x-0 bottom-0 bg-card-bg/95 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex items-stretch justify-around h-16">
        {list.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 h-full min-h-11 px-2 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  className={`w-5 h-5 ${isActive ? 'text-accent' : ''}`}
                  aria-hidden="true"
                />
                <span className="leading-none">{item.shortLabel ?? item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
