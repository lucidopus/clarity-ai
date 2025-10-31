'use client';

interface Tab {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

interface MaterialsTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function MaterialsTabs({ tabs, activeTab, onTabChange }: MaterialsTabsProps) {
  return (
    <div className="border-b border-border bg-card-bg">
      <div className="flex space-x-8 px-6">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isDisabled = tab.disabled;

          return (
            <button
              key={tab.id}
              onClick={() => !isDisabled && onTabChange(tab.id)}
              disabled={isDisabled}
              className={`
                flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap
                ${
                  isActive
                    ? 'border-accent text-accent'
                    : isDisabled
                    ? 'border-transparent text-muted-foreground/50 cursor-not-allowed'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }
              `}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`
                  px-2 py-0.5 text-xs rounded-full
                  ${isActive ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'}
                `}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}