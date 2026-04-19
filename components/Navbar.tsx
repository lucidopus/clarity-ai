'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Button from './Button';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '@/lib/auth-context';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const showMarketingLinks = !pathname?.startsWith('/onboarding') && !pathname?.startsWith('/auth');

  return (
    <nav className="sticky top-0 z-50 bg-[color-mix(in_srgb,var(--background)_92%,transparent)] md:bg-[color-mix(in_srgb,var(--background)_72%,transparent)] backdrop-blur-md border-b border-white/50 dark:border-white/6 px-4 sm:px-6 md:px-8 after:absolute after:-bottom-px after:left-0 after:right-0 after:h-[2px] after:bg-linear-to-r after:from-transparent after:via-accent/40 after:to-transparent">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 cursor-pointer shrink-0">
            <div className="w-7 h-7 bg-accent rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-base">C</span>
            </div>
            <span className="text-lg font-bold text-foreground">Clarity AI</span>
          </Link>

          {/* Desktop Navigation - Center */}
          {showMarketingLinks && (
            <div className="hidden md:flex items-center space-x-1">
              <Link
                href="#features"
                className="text-sm text-secondary hover:text-foreground hover:bg-accent/10 rounded-full px-3 py-1.5 transition-colors duration-150 cursor-pointer"
              >
                Features
              </Link>
              <Link
                href="#why-clarity"
                className="text-sm text-secondary hover:text-foreground hover:bg-accent/10 rounded-full px-3 py-1.5 transition-colors duration-150 cursor-pointer"
              >
                Why Clarity
              </Link>
              <Link
                href="#how-it-works"
                className="text-sm text-secondary hover:text-foreground hover:bg-accent/10 rounded-full px-3 py-1.5 transition-colors duration-150 cursor-pointer"
              >
                How It Works
              </Link>
              <Link
                href="#pricing"
                className="text-sm text-secondary hover:text-foreground hover:bg-accent/10 rounded-full px-3 py-1.5 transition-colors duration-150 cursor-pointer"
              >
                Pricing
              </Link>
            </div>
          )}

          {/* Desktop Right Side - Auth & Theme */}
          <div className="hidden md:flex items-center space-x-4 shrink-0">
            <ThemeToggle />
            {loading ? (
              <div className="text-sm text-secondary">Loading...</div>
            ) : user ? (
              <>
                <Button href="/dashboard" variant="ghost" size="sm" className="text-sm">
                  Dashboard
                </Button>
                <Button onClick={logout} variant="ghost" size="sm" className="text-sm">
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button href="/auth/signin" variant="ghost" size="sm" className="text-sm">
                  Sign In
                </Button>
                <Button href="/auth/signup" variant="primary" size="sm" className="text-sm">
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-1 ml-auto">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg hover:bg-card-bg transition-colors cursor-pointer"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
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
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-border/50 bg-background/95 -mx-4 sm:-mx-6 px-4 sm:px-6">
            <div className="flex flex-col space-y-1">
              {showMarketingLinks && (
                <>
                  <Link
                    href="#features"
                    className="flex items-center min-h-11 text-sm text-secondary hover:text-foreground transition-colors px-3 rounded-lg hover:bg-card-bg cursor-pointer"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Features
                  </Link>
                  <Link
                    href="#why-clarity"
                    className="flex items-center min-h-11 text-sm text-secondary hover:text-foreground transition-colors px-3 rounded-lg hover:bg-card-bg cursor-pointer"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Why Clarity
                  </Link>
                  <Link
                    href="#how-it-works"
                    className="flex items-center min-h-11 text-sm text-secondary hover:text-foreground transition-colors px-3 rounded-lg hover:bg-card-bg cursor-pointer"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    How It Works
                  </Link>
                  <Link
                    href="#pricing"
                    className="flex items-center min-h-11 text-sm text-secondary hover:text-foreground transition-colors px-3 rounded-lg hover:bg-card-bg cursor-pointer"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Pricing
                  </Link>
                </>
              )}
              <div className="pt-3 mt-2 border-t border-border flex flex-col gap-2">
                {loading ? (
                  <div className="text-sm text-secondary text-center py-2">Loading...</div>
                ) : user ? (
                  <>
                    <Button href="/dashboard" variant="ghost" size="sm" className="w-full justify-center" onClick={() => setMobileMenuOpen(false)}>
                      Dashboard
                    </Button>
                    <Button onClick={() => { setMobileMenuOpen(false); logout(); }} variant="ghost" size="sm" className="w-full justify-center">
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button href="/auth/signin" variant="ghost" size="sm" className="w-full justify-center" onClick={() => setMobileMenuOpen(false)}>
                      Sign In
                    </Button>
                    <Button href="/auth/signup" variant="primary" size="sm" className="w-full justify-center" onClick={() => setMobileMenuOpen(false)}>
                      Get Started
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
