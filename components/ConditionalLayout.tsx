'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';
import Navbar from './Navbar';

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');
  const isGenerations = pathname?.startsWith('/generations');
  const isAdmin = pathname?.startsWith('/admin');

  if (isDashboard) {
    // Dashboard has its own layout
    return <>{children}</>;
  }

  if (isGenerations) {
    return (
      <>
        {children}
      </>
    );
  }

  return (
    <>
      {!isAdmin && <Navbar />}
      {children}
      <Footer />
    </>
  );
}
