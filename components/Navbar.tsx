'use client';

import Link from 'next/link';
import { useState } from 'react';
import Button from './Button';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '@/lib/auth-context';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, loading } = useAuth();

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 cursor-pointer">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <span className="text-xl font-bold text-foreground">Clarity AI</span>
          </Link>

          {/* Desktop Navigation - Centered */}
          <div className="hidden md:flex items-center justify-center flex-1 space-x-8">
            <Link
              href="#about"
              className="text-foreground hover:text-accent transition-colors duration-150 cursor-pointer"
            >
              About
            </Link>
            <Link
              href="#features"
              className="text-foreground hover:text-accent transition-colors duration-150 cursor-pointer"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-foreground hover:text-accent transition-colors duration-150 cursor-pointer"
            >
              How It Works
            </Link>
            <Link
              href="#pricing"
              className="text-foreground hover:text-accent transition-colors duration-150 cursor-pointer"
            >
              Pricing
            </Link>
          </div>

          {/* Desktop Right Side - Auth & Theme */}
          <div className="hidden md:flex items-center space-x-4">
            <ThemeToggle />
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : user ? (
              <>
                <Button href="/dashboard" variant="ghost" size="sm">
                  Dashboard
                </Button>
                <Button onClick={logout} variant="ghost" size="sm">
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button href="/auth/signin" variant="ghost" size="sm">
                  Sign In
                </Button>
                <Button href="/auth/signup" variant="primary" size="sm">
                  Sign Up
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2 ml-auto">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-card-bg transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
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
                  className="w-6 h-6"
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
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col space-y-4">
              <Link
                href="#about"
                className="text-foreground hover:text-accent transition-colors px-4 py-2 cursor-pointer"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
              <Link
                href="#features"
                className="text-foreground hover:text-accent transition-colors px-4 py-2 cursor-pointer"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                className="text-foreground hover:text-accent transition-colors px-4 py-2 cursor-pointer"
                onClick={() => setMobileMenuOpen(false)}
              >
                How It Works
              </Link>
              <Link
                href="#pricing"
                className="text-foreground hover:text-accent transition-colors px-4 py-2 cursor-pointer"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
               <div className="px-4 pt-2 border-t border-border">
                 {loading ? (
                   <div className="text-sm text-muted-foreground text-center py-2">Loading...</div>
                 ) : user ? (
                   <>
                     <Button href="/dashboard" variant="ghost" size="sm" className="w-full mb-2">
                       Dashboard
                     </Button>
                     <Button onClick={logout} variant="ghost" size="sm" className="w-full">
                       Logout
                     </Button>
                   </>
                 ) : (
                   <>
                     <Button href="/auth/signin" variant="ghost" size="sm" className="w-full mb-2">
                       Sign In
                     </Button>
                     <Button href="/auth/signup" variant="primary" size="sm" className="w-full">
                       Sign Up
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
