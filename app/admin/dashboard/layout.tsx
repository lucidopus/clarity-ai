'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, Users, LogOut } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import Button from '@/components/Button';

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const response = await fetch('/api/admin/auth/verify');
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated) {
            setAuthenticated(true);
          } else {
            router.push('/admin');
          }
        } else {
          router.push('/admin');
        }
      } catch (error) {
        console.error('Auth verification failed:', error);
        router.push('/admin');
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
      });
      router.push('/admin');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Sidebar Skeleton */}
        <div className="w-64 bg-card-bg border-r border-border flex flex-col">
          <div className="p-6 border-b border-border">
            <div className="h-8 bg-accent/20 rounded animate-pulse w-32"></div>
          </div>
          <div className="flex-1 p-4">
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center space-x-3 p-3 rounded-lg">
                  <div className="w-5 h-5 bg-secondary/20 rounded animate-pulse"></div>
                  <div className="h-4 bg-secondary/20 rounded animate-pulse flex-1"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Skeleton */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-8 py-8">
            <div className="h-8 bg-secondary/20 rounded mb-8 animate-pulse w-48"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card-bg rounded-xl border border-border p-6">
                  <div className="h-4 bg-secondary/20 rounded mb-2 animate-pulse w-16"></div>
                  <div className="h-8 bg-secondary/20 rounded animate-pulse w-12"></div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!authenticated) {
    return null; // Will redirect
  }

  const navItems = [
    {
      href: '/admin/dashboard',
      label: 'Analytics',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      href: '/admin/dashboard/users',
      label: 'User Management',
      icon: <Users className="w-5 h-5" />,
    },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
       {/* Admin Sidebar */}
       <aside className="w-64 bg-card-bg border-r border-border flex flex-col shrink-0">
         {/* Logo/Title */}
         <div className="px-6 py-8 border-b border-border">
           <div className="flex items-center space-x-3">
             <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
               <span className="text-white font-bold text-xl">C</span>
             </div>
             <h1 className="text-xl font-bold text-foreground">Clarity AI</h1>
           </div>
         </div>

         {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-muted-foreground hover:bg-background hover:text-foreground'
                  }`}
                >
                  <span className={isActive ? 'text-accent' : ''}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Logout Button */}
      </aside>

       {/* Main Content Area */}
       <main className="flex-1 overflow-y-auto">
         <div className="max-w-7xl mx-auto px-8 py-8">
           {/* Admin Header */}
           <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
             <div className="flex items-center space-x-3">
               <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                 <span className="text-white font-bold text-xl">C</span>
               </div>
               <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
             </div>
             <div className="flex items-center space-x-4">
               <ThemeToggle />
               <Button onClick={handleLogout} variant="ghost" size="icon" aria-label="Logout">
                 <LogOut className="w-5 h-5" />
               </Button>
             </div>
           </div>
           {children}
         </div>
       </main>
    </div>
  );
}
