'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Tab {
  name: string;
  href: string;
  icon?: React.ReactNode;
}

interface TabNavigationProps {
  tabs: Tab[];
}

export default function TabNavigation({ tabs }: TabNavigationProps) {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);

            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`
                  flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap
                  ${
                    isActive
                      ? 'border-accent text-accent'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }
                `}
              >
                {tab.icon && <span>{tab.icon}</span>}
                <span>{tab.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
