import React from 'react';

export interface SectionTitleProps {
  children: React.ReactNode;
  subtitle?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export default function SectionTitle({
  children,
  subtitle,
  align = 'center',
  className = '',
}: SectionTitleProps) {
  const alignStyles = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <div className={`mb-12 ${alignStyles[align]} ${className}`}>
      <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
        {children}
      </h2>
      {subtitle && (
        <p className="text-lg text-secondary max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
    </div>
  );
}
