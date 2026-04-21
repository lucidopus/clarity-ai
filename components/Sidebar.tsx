'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { primaryNavItems } from '@/lib/navigation/primary-nav';
import { Z_INDEX } from '@/lib/constants/z-index';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Hover-expand behaviour mirroring the generations page sidebar: the outer
  // wrapper reserves only the collapsed rail width, and an absolutely-
  // positioned inner <aside> animates its width on hover so it grows over the
  // main content instead of pushing it around.
  //
  // Expand is also triggered by keyboard focus inside the rail (so keyboard
  // users see labels), and touch devices (no hover) force the sidebar to stay
  // expanded since "hover" is not a thing there.
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Narrower rail on tablet (md-range), full 80-px rail on desktop (lg+).
  const [collapsedRailPx, setCollapsedRailPx] = useState(80);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const apply = (matches: boolean) => setCollapsedRailPx(matches ? 80 : 64);
    apply(mq.matches);
    const handler = (e: MediaQueryListEvent) => apply(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Detect touch devices (coarse pointer, no hover) — on these we keep the
  // sidebar expanded so users always see nav labels.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(hover: none), (pointer: coarse)');
    const apply = (matches: boolean) => {
      setIsTouchDevice(matches);
      if (matches) setIsCollapsed(false);
    };
    apply(mq.matches);
    const handler = (e: MediaQueryListEvent) => apply(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const expand = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    setIsCollapsed(false);
  };

  const scheduleCollapse = () => {
    if (isTouchDevice) return; // touch devices stay expanded
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
    }
    collapseTimerRef.current = setTimeout(() => {
      setIsCollapsed(true);
      collapseTimerRef.current = null;
    }, 400);
  };

  useEffect(() => {
    return () => {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, []);

  return (
    <div
      className={`hidden md:block sticky top-0 shrink-0 h-dvh ${isTouchDevice ? 'w-64' : 'w-16 lg:w-20'}`}
      style={{ zIndex: Z_INDEX.sidebar }}
      onMouseEnter={expand}
      onMouseLeave={scheduleCollapse}
      onFocusCapture={expand}
      onBlurCapture={scheduleCollapse}
    >
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? collapsedRailPx : 256 }}
        transition={{ type: 'tween', duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
        className="absolute top-0 left-0 h-full bg-card-bg border-r border-border flex flex-col overflow-hidden shadow-xl"
        style={{ willChange: 'width' }}
      >
        {/* Header — logo stays anchored in the rail column, wordmark reveals as
            the aside grows. */}
        <div className="h-16 flex items-center border-b border-border shrink-0">
          <Link
            href="/"
            aria-label="Clarity home"
            className="w-16 lg:w-20 h-full flex items-center justify-center shrink-0 cursor-pointer"
          >
            <span className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white font-bold text-lg hover:opacity-80 transition-opacity">
              C
            </span>
          </Link>
          <span className="font-bold text-lg text-foreground whitespace-nowrap">
            Clarity
          </span>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-2">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                className={`relative flex items-center w-full h-12 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/10'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent rounded-r-full" />
                )}
                <div className="w-16 lg:w-20 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-sm whitespace-nowrap">{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-border shrink-0 py-2">
          {user && (
            <div
              className="flex items-center w-full h-12"
              title={user.email}
            >
              <div className="w-16 lg:w-20 flex items-center justify-center shrink-0">
                <div className="w-8 h-8 rounded-full bg-accent/15 text-accent text-xs font-semibold flex items-center justify-center">
                  {(user.firstName?.[0] ?? 'U').toUpperCase()}
                  {(user.lastName?.[0] ?? '').toUpperCase()}
                </div>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap truncate pr-4 max-w-[176px]">
                {user.email}
              </span>
            </div>
          )}
          <button
            onClick={logout}
            title="Logout"
            className="flex items-center w-full h-12 transition-colors cursor-pointer text-red-500/80 hover:text-red-500 hover:bg-red-500/10"
          >
            <div className="w-16 lg:w-20 flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4 shrink-0" />
            </div>
            <span className="text-sm whitespace-nowrap">Logout</span>
          </button>
        </div>
      </motion.aside>
    </div>
  );
}
