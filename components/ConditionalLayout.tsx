'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');
  const isGenerations = pathname?.startsWith('/generations');

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
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
